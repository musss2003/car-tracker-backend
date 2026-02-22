import express, { RequestHandler } from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import authenticate from '../middlewares/verify-jwt.middleware';

const router = express.Router();
router.use(authenticate);

// ── B2 config ─────────────────────────────────────────────────────────────────
// Required env vars:
//   B2_ENDPOINT      = https://s3.us-west-004.backblazeb2.com
//   B2_REGION        = us-west-004
//   B2_KEY_ID        = your application key ID
//   B2_APP_KEY       = your application key
//   B2_BUCKET        = your bucket name
//   SIGNED_URL_EXPIRY= 900 (optional, default 15 min)
const s3 = new S3Client({
  endpoint: process.env.B2_ENDPOINT!,
  region: process.env.B2_REGION!,
  forcePathStyle: true, // required for B2 S3-compatible API
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APP_KEY!,
  },
});

const BUCKET = process.env.B2_BUCKET!;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const SIGNED_URL_EXPIRY = parseInt(process.env.SIGNED_URL_EXPIRY || '900', 10);

// ── Allowed MIME types ────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

const sanitizeFilename = (filename: string): string =>
  filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();

// ── Multer → B2 storage ───────────────────────────────────────────────────────
const upload = multer({
  storage: multerS3({
    s3,
    bucket: BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, { uploadedBy: (req as any).user?.id || 'unknown' });
    },
    key: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext);
      const sanitized = sanitizeFilename(baseName);
      cb(null, `uploads/${file.fieldname}-${sanitized}-${uniqueSuffix}${ext}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

// ── POST /api/upload ──────────────────────────────────────────────────────────
router.post('/upload', (req, res) => {
  upload.single('document')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          message: 'File too large',
          maxSize: `${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.file as Express.MulterS3.File;
    const userId = (req as any).user?.id || 'unknown';
    console.log(`File uploaded to B2: ${file.key} by user ${userId} (${file.size} bytes)`);

    res.json({
      message: 'File uploaded successfully',
      filename: file.key,
      size: file.size,
      mimetype: file.mimetype,
    });
  });
});

// ── GET /api/upload/documents/:filename ──────────────────────────────────────
const getDocument: RequestHandler = async (req, res) => {
  const filename = req.params.filename;

  if (!filename || filename.includes('..') || filename.startsWith('/')) {
    console.warn(`[Security] Invalid filename attempt: ${filename}`);
    res.status(400).json({ message: 'Invalid filename' });
    return;
  }

  const key = filename.startsWith('uploads/') ? filename : `uploads/${filename}`;

  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: SIGNED_URL_EXPIRY });

    const userId = (req as any).user?.id || 'unknown';
    console.log(
      `Signed URL generated for: ${key} by user ${userId} (expires in ${SIGNED_URL_EXPIRY}s)`
    );

    // Redirect to signed URL — client fetches directly from B2, no bandwidth on your server
    res.redirect(302, signedUrl);
  } catch (error) {
    console.error(`Failed to generate signed URL for ${key}:`, error);
    res.status(404).json({ message: 'File not found' });
  }
};

// ── DELETE /api/upload/documents/:filename ────────────────────────────────────
const deleteDocument: RequestHandler = async (req, res) => {
  const filename = req.params.filename;

  if (!filename || filename.includes('..') || filename.startsWith('/')) {
    res.status(400).json({ message: 'Invalid filename' });
    return;
  }

  const key = filename.startsWith('uploads/') ? filename : `uploads/${filename}`;

  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));

    const userId = (req as any).user?.id || 'unknown';
    console.log(`File deleted from B2: ${key} by user ${userId}`);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error(`Failed to delete ${key}:`, error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
};

router.get('/documents/:filename(*)', getDocument);
router.delete('/documents/:filename(*)', deleteDocument);

export default router;
