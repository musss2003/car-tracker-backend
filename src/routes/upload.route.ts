import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import authenticate from '../middlewares/verify-jwt.middleware';

const router = express.Router();

router.use(authenticate);

// Configure multer for private storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../private_uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
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
 *                 description: File to upload (max 10MB)
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
 *       400:
 *         description: No file uploaded
 *       401:
 *         description: Unauthorized
 */
router.post('/upload', upload.single('document'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }

  // Store reference in DB if you want (e.g. req.file.filename)
  res.json({ message: 'File uploaded successfully', filename: req.file.filename });
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
 *       400:
 *         description: Invalid filename
 *       404:
 *         description: File not found
 *       401:
 *         description: Unauthorized
 */
router.get('/documents/:filename', (req, res) => {
  const filename = req.params.filename;

  // Basic validation to prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    res.status(400).json({ message: 'Invalid filename' });
    return;
  }

  const filePath = path.join(__dirname, '../../private_uploads', filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ message: 'File not found' });
    return;
  }

  // Send file with proper content type for images
  const ext = path.extname(filename).toLowerCase();
  const contentTypeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
  };

  const contentType = contentTypeMap[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);

  // For inline viewing (not forcing download)
  res.sendFile(filePath);
});

export default router;
