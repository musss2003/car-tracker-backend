/**
 * Tests for upload.route.ts
 * File location: src/routes/__tests__/upload.route.test.ts
 * Route location: src/routes/upload.route.ts
 */

import request from 'supertest';
import express from 'express';

// ── Env vars (must be set before any imports that read them) ──────────────────
process.env.B2_ENDPOINT = 'https://s3.us-west-004.backblazeb2.com';
process.env.B2_REGION = 'us-west-004';
process.env.B2_KEY_ID = 'test-key-id';
process.env.B2_APP_KEY = 'test-app-key';
process.env.B2_BUCKET = 'test-bucket';
process.env.SIGNED_URL_EXPIRY = '900';

// Silence expected console output during tests
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ── Mock: authenticate middleware ─────────────────────────────────────────────
jest.mock('../../middlewares/verify-jwt.middleware', () =>
  jest.fn((req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-123' };
    next();
  })
);

// ── Mock: S3Client ────────────────────────────────────────────────────────────
const mockS3Send = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  GetObjectCommand: jest.fn().mockImplementation((input) => ({ _type: 'GetObject', input })),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ _type: 'DeleteObject', input })),
}));

// ── Mock: getSignedUrl ────────────────────────────────────────────────────────
const mockGetSignedUrl = jest.fn();

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

// ── Mock: multer-s3 ───────────────────────────────────────────────────────────
jest.mock('multer-s3', () => {
  const mock = jest.fn().mockReturnValue('__multer_s3_storage__');
  (mock as any).AUTO_CONTENT_TYPE = jest.fn();
  return mock;
});

// ── Mock: multer (controllable behavior per test) ─────────────────────────────
type MulterBehavior = 'success' | 'no-file' | 'size-limit' | 'bad-type' | 'generic-error';
let mockMulterBehavior: MulterBehavior = 'success';

jest.mock('multer', () => {
  class MulterError extends Error {
    code: string;
    constructor(code: string, message?: string) {
      super(message || code);
      this.code = code;
      this.name = 'MulterError';
    }
  }

  const multerInstance = {
    single: jest.fn().mockReturnValue((req: any, res: any, cb: Function) => {
      switch (mockMulterBehavior) {
        case 'success':
          req.file = {
            key: 'uploads/document-test_file-1234567890-123456789.pdf',
            size: 1024,
            mimetype: 'application/pdf',
            fieldname: 'document',
            originalname: 'test file.pdf',
            encoding: '7bit',
          };
          cb(null);
          break;

        case 'no-file':
          // req.file intentionally not set
          cb(null);
          break;

        case 'size-limit':
          cb(Object.assign(new MulterError('LIMIT_FILE_SIZE', 'File too large'), {}));
          break;

        case 'bad-type':
          cb(new Error('File type not allowed'));
          break;

        case 'generic-error':
          cb(new Error('Unexpected upload error'));
          break;
      }
    }),
  };

  const multerFn: any = jest.fn().mockReturnValue(multerInstance);
  multerFn.MulterError = MulterError;
  multerFn.diskStorage = jest.fn();

  return multerFn;
});

// ── App factory ───────────────────────────────────────────────────────────────
// Import the router once — mocks are already in place at module load time
import uploadRoute from '../upload.route';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/upload', uploadRoute);
  return app;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  mockMulterBehavior = 'success';
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/upload
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/upload/upload', () => {
  it('returns 200 with file metadata on successful upload', async () => {
    const res = await request(buildApp())
      .post('/api/upload/upload')
      .attach('document', Buffer.from('fake pdf'), {
        filename: 'test file.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('File uploaded successfully');
    expect(res.body.filename).toMatch(/^uploads\//);
    expect(res.body.size).toBe(1024);
    expect(res.body.mimetype).toBe('application/pdf');
  });

  it('returns 400 when no file is attached', async () => {
    mockMulterBehavior = 'no-file';

    const res = await request(buildApp()).post('/api/upload/upload');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('No file uploaded');
  });

  it('returns 413 when file exceeds size limit', async () => {
    mockMulterBehavior = 'size-limit';

    const res = await request(buildApp()).post('/api/upload/upload');

    expect(res.status).toBe(413);
    expect(res.body.message).toBe('File too large');
    expect(res.body.maxSize).toBe('20MB');
  });

  it('returns 400 when file type is not allowed', async () => {
    mockMulterBehavior = 'bad-type';

    const res = await request(buildApp()).post('/api/upload/upload');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('File type not allowed');
  });

  it('returns 400 on unexpected multer error', async () => {
    mockMulterBehavior = 'generic-error';

    const res = await request(buildApp()).post('/api/upload/upload');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Unexpected upload error');
  });

  it('filename in response starts with uploads/ prefix', async () => {
    const res = await request(buildApp()).post('/api/upload/upload');

    expect(res.status).toBe(200);
    expect(res.body.filename).toMatch(/^uploads\//);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/upload/documents/:filename
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/upload/documents/:filename', () => {
  it('redirects (302) to a signed URL for a valid filename', async () => {
    mockGetSignedUrl.mockResolvedValue('https://b2.example.com/signed-url?token=abc');

    const res = await request(buildApp()).get(
      '/api/upload/documents/uploads/document-test-123.pdf'
    );

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://b2.example.com/signed-url?token=abc');
  });

  it('prepends uploads/ prefix when filename does not include it', async () => {
    mockGetSignedUrl.mockResolvedValue('https://b2.example.com/signed');
    const { GetObjectCommand } = require('@aws-sdk/client-s3');

    await request(buildApp()).get('/api/upload/documents/myfile.pdf');

    expect(GetObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ Key: 'uploads/myfile.pdf' })
    );
  });

  it('does not double-prefix when filename already starts with uploads/', async () => {
    mockGetSignedUrl.mockResolvedValue('https://b2.example.com/signed');
    const { GetObjectCommand } = require('@aws-sdk/client-s3');

    await request(buildApp()).get('/api/upload/documents/uploads/already-prefixed.pdf');

    expect(GetObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ Key: 'uploads/already-prefixed.pdf' })
    );
  });

  it('passes correct expiresIn to getSignedUrl', async () => {
    mockGetSignedUrl.mockResolvedValue('https://b2.example.com/signed');

    await request(buildApp()).get('/api/upload/documents/test.pdf');

    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: 900 })
    );
  });

  it('returns 400 for directory traversal with ..', async () => {
    const res = await request(buildApp()).get('/api/upload/documents/..%2F..%2Fetc%2Fpasswd');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid filename');
  });

  it('returns 404 when getSignedUrl throws (file not found in B2)', async () => {
    mockGetSignedUrl.mockRejectedValue(new Error('NoSuchKey'));

    const res = await request(buildApp()).get('/api/upload/documents/nonexistent.pdf');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('File not found');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/upload/documents/:filename
// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/upload/documents/:filename', () => {
  it('returns 200 on successful deletion', async () => {
    mockS3Send.mockResolvedValue({});

    const res = await request(buildApp()).delete(
      '/api/upload/documents/uploads/document-test-123.pdf'
    );

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('File deleted successfully');
  });

  it('calls DeleteObjectCommand with the correct key', async () => {
    mockS3Send.mockResolvedValue({});
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

    await request(buildApp()).delete('/api/upload/documents/myfile.pdf');

    expect(DeleteObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ Key: 'uploads/myfile.pdf' })
    );
  });

  it('uses the correct bucket name from env', async () => {
    mockS3Send.mockResolvedValue({});
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

    await request(buildApp()).delete('/api/upload/documents/myfile.pdf');

    expect(DeleteObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: 'test-bucket' })
    );
  });

  it('returns 400 for directory traversal attempt', async () => {
    const res = await request(buildApp()).delete('/api/upload/documents/..%2Fsecret.pdf');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid filename');
  });

  it('returns 500 when S3 delete throws', async () => {
    mockS3Send.mockRejectedValue(new Error('S3 internal error'));

    const res = await request(buildApp()).delete('/api/upload/documents/file.pdf');

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Failed to delete file');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Authentication
// ─────────────────────────────────────────────────────────────────────────────
describe('Authentication', () => {
  it('blocks requests when authenticate returns 401', async () => {
    // Temporarily override the mock to reject auth
    const authenticate = require('../../middlewares/verify-jwt.middleware');
    authenticate.mockImplementationOnce((_req: any, res: any) => {
      res.status(401).json({ message: 'Unauthorized' });
    });

    const res = await request(buildApp()).post('/api/upload/upload');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Unauthorized');
  });

  it('allows requests when authenticate calls next()', async () => {
    // Default mock calls next() — just verify 200 is reachable
    const res = await request(buildApp()).post('/api/upload/upload');

    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Security — directory traversal
// ─────────────────────────────────────────────────────────────────────────────
describe('Security — directory traversal', () => {
  const traversalPayloads = ['../etc/passwd', '..%2Fetc%2Fpasswd', '....//etc/passwd'];

  describe('GET', () => {
    test.each(traversalPayloads)('blocks: %s', async (payload) => {
      const res = await request(buildApp()).get(
        `/api/upload/documents/${encodeURIComponent(payload)}`
      );

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid filename');
    });
  });

  describe('DELETE', () => {
    test.each(traversalPayloads)('blocks: %s', async (payload) => {
      const res = await request(buildApp()).delete(
        `/api/upload/documents/${encodeURIComponent(payload)}`
      );

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid filename');
    });
  });
});
