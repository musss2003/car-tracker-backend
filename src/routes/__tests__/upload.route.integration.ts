/**
 * Integration tests — run manually against real B2 bucket.
 * Requires a .env.test file with real B2 credentials.
 *
 * Run with:
 *   npm run test:integration
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ── Validate required env vars ────────────────────────────────────────────────
const REQUIRED_VARS = ['B2_ENDPOINT', 'B2_REGION', 'B2_KEY_ID', 'B2_APP_KEY', 'B2_BUCKET'];
const missing = REQUIRED_VARS.filter((v) => !process.env[v]);

if (missing.length > 0) {
  console.warn(`⚠️  Skipping — missing env vars: ${missing.join(', ')}`);
}

const describeIfConfigured = missing.length === 0 ? describe : describe.skip;

// ── S3 client using real credentials ─────────────────────────────────────────
// Created here at module level — dotenv has already run above
const s3 = new S3Client({
  endpoint: process.env.B2_ENDPOINT!,
  region: process.env.B2_REGION!,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APP_KEY!,
  },
});

const BUCKET = process.env.B2_BUCKET!;
const EXPIRY = parseInt(process.env.SIGNED_URL_EXPIRY || '900', 10);
const TEST_KEY = `uploads/integration-test-${Date.now()}.pdf`;

// ─────────────────────────────────────────────────────────────────────────────
describeIfConfigured('B2 Integration', () => {
  beforeAll(() => {
    console.log('\n🔧 B2 Config:');
    console.log('   ENDPOINT:', process.env.B2_ENDPOINT);
    console.log('   BUCKET:  ', BUCKET);
    console.log('   KEY_ID:  ', process.env.B2_KEY_ID?.slice(0, 10) + '...');
    console.log('   TEST_KEY:', TEST_KEY);
  });

  // ── Upload ──────────────────────────────────────────────────────────────────
  it('uploads a file to B2', async () => {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: TEST_KEY,
        Body: Buffer.from('%PDF-1.4 integration test content'),
        ContentType: 'application/pdf',
      })
    );

    console.log('✅ Uploaded:', TEST_KEY);
  }, 15000);

  // ── Signed URL ──────────────────────────────────────────────────────────────
  it('generates a valid signed URL', async () => {
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: TEST_KEY }), {
      expiresIn: EXPIRY,
    });

    expect(url).toContain('backblazeb2.com');
    expect(url).toContain(TEST_KEY.replace('/', '%2F').split('%2F').pop());
    console.log('✅ Signed URL generated (first 80 chars):', url.slice(0, 80) + '...');
  }, 15000);

  // ── File accessible via signed URL ──────────────────────────────────────────
  it('file is accessible via signed URL', async () => {
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: TEST_KEY }), {
      expiresIn: EXPIRY,
    });

    const res = await fetch(url);
    expect(res.status).toBe(200);

    const body = await res.text();
    expect(body).toContain('%PDF-1.4');
    console.log('✅ File accessible, content length:', body.length);
  }, 15000);

  // ── Delete ──────────────────────────────────────────────────────────────────
  it('deletes the file from B2', async () => {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: TEST_KEY,
      })
    );

    console.log('✅ Deleted:', TEST_KEY);
  }, 15000);

  // ── Confirm deleted ─────────────────────────────────────────────────────────
  it('signed URL returns 404 after deletion', async () => {
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: TEST_KEY }), {
      expiresIn: EXPIRY,
    });

    const res = await fetch(url);
    expect(res.status).toBe(404);
    console.log('✅ Confirmed 404 after deletion');
  }, 15000);
});
