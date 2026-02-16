import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import authenticate from '../middlewares/verify-jwt.middleware';

const router = express.Router();

router.use(authenticate);

// Upload directory - use environment variable with fallback
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/private_uploads';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// Allowed file types (MIME types)
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

// File filter for security
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

// Sanitize filename to prevent security issues
const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .toLowerCase();
};

// Configure multer for private storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure upload directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      try {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o755 });
        console.log(`Created upload directory: ${UPLOAD_DIR}`);
      } catch (error) {
        console.error('Failed to create upload directory:', error);
        return cb(new Error('Failed to create upload directory'), '');
      }
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const sanitizedName = sanitizeFilename(baseName);
    cb(null, `${file.fieldname}-${sanitizedName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

/**
 * @swagger
 * /api/upload/upload:
 *   post:
 *     tags: [File Upload]
 *     summary: Upload a document file
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [document]
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: File to upload (max 20MB)
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 filename:
 *                   type: string
 *                 size:
 *                   type: number
 *                 mimetype:
 *                   type: string
 *       400:
 *         description: No file uploaded or invalid file type
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File too large
 */
router.post('/upload', (req, res) => {
  upload.single('document')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer-specific errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        console.error(`File too large: ${err.message}`);
        return res.status(413).json({
          message: 'File too large',
          maxSize: `${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        });
      }
      console.error('Multer error:', err);
      return res.status(400).json({ message: err.message });
    } else if (err) {
      // Other errors (e.g., file type validation)
      console.error('Upload error:', err);
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Log successful upload
    const userId = (req as any).user?.id || 'unknown';
    console.log(`File uploaded: ${req.file.filename} by user ${userId} (${req.file.size} bytes)`);

    res.json({
      message: 'File uploaded successfully',
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });
});

/**
 * @swagger
 * /api/upload/documents/{filename}:
 *   get:
 *     tags: [File Upload]
 *     summary: Download/view uploaded document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the file to download
 *     responses:
 *       200:
 *         description: File content
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/msword:
 *             schema:
 *               type: string
 *               format: binary
 *           application/vnd.openxmlformats-officedocument.wordprocessingml.document:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid filename
 *       404:
 *         description: File not found
 *       401:
 *         description: Unauthorized
 */
router.get('/documents/:filename', (req, res) => {
  const filename = req.params.filename;

  // Validate filename to prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    console.warn(`[Security] Directory traversal attempt: ${filename}`);
    res.status(400).json({ message: 'Invalid filename' });
    return;
  }

  // Additional validation for empty or suspicious filenames
  if (!filename || filename.trim() === '' || filename.startsWith('.')) {
    console.warn(`[Security] Invalid filename attempt: ${filename}`);
    res.status(400).json({ message: 'Invalid filename' });
    return;
  }

  const filePath = path.join(UPLOAD_DIR, filename);

  // Verify file exists
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filename}`);
    res.status(404).json({ message: 'File not found' });
    return;
  }

  // Send file with proper content type
  const ext = path.extname(filename).toLowerCase();
  const contentTypeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  const contentType = contentTypeMap[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);

  // Log download
  const userId = (req as any).user?.id || 'unknown';
  console.log(`File downloaded: ${filename} by user ${userId}`);

  // For inline viewing (not forcing download)
  res.sendFile(filePath);
});

export default router;
