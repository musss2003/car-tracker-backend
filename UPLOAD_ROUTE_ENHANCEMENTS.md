# Upload Route Security Enhancements

## Overview

Enhanced `src/routes/upload.route.ts` with comprehensive security features, better error handling, and improved configuration management.

## Changes Made

### 1. Configuration Management

```typescript
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/private_uploads';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
```

**Benefits:**

- Environment variable support for flexible deployment
- Easy configuration changes without code modification
- Clear constant for file size limit

### 2. File Type Restriction (Security)

```typescript
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

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};
```

**Security Benefits:**

- Prevents malicious file uploads (executables, scripts)
- Whitelist approach (only allow known-safe types)
- Clear error messages listing allowed types
- Validates MIME type before saving to disk

### 3. Filename Sanitization (Security)

```typescript
const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
};
```

**Security Benefits:**

- Prevents filename injection attacks
- Removes shell special characters
- Prevents path traversal in filename
- Normalizes filenames for consistency

### 4. Enhanced Upload Endpoint

#### Error Handling

- Multer-specific error handling
- File size limit errors (413 status)
- File type validation errors (400 status)
- Missing file errors (400 status)

#### Logging

```typescript
const userId = (req as any).user?.id || 'unknown';
console.log(`File uploaded: ${req.file.filename} by user ${userId} (${req.file.size} bytes)`);
```

**Benefits:**

- Audit trail for all uploads
- User accountability
- File size tracking
- Easier debugging

#### Response

```typescript
res.json({
  message: 'File uploaded successfully',
  filename: req.file.filename,
  size: req.file.size,
  mimetype: req.file.mimetype,
});
```

**Benefits:**

- Client receives complete file information
- Frontend can display file details
- Mimetype confirmation for validation

### 5. Enhanced Download Endpoint

#### Security Validation

```typescript
// Directory traversal prevention
if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
  console.warn(`[Security] Directory traversal attempt: ${filename}`);
  return res.status(400).json({ message: 'Invalid filename' });
}

// Empty/hidden file prevention
if (!filename || filename.trim() === '' || filename.startsWith('.')) {
  console.warn(`[Security] Invalid filename attempt: ${filename}`);
  return res.status(400).json({ message: 'Invalid filename' });
}
```

**Security Benefits:**

- Prevents directory traversal attacks
- Blocks hidden file access
- Security logging for suspicious attempts

#### Download Logging

```typescript
const userId = (req as any).user?.id || 'unknown';
console.log(`File downloaded: ${filename} by user ${userId}`);
```

**Benefits:**

- Audit trail for downloads
- User accountability
- Compliance with data access policies

#### Content Type Mapping

```typescript
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
```

**Benefits:**

- Proper MIME types for browser rendering
- Supports all allowed file types
- Fallback to octet-stream for unknown types

### 6. Updated Swagger Documentation

#### Upload Endpoint

- Updated max file size to 20MB
- Added detailed response schema (filename, size, mimetype)
- Added 413 status for file too large
- Enhanced description

#### Download Endpoint

- Added all supported content types
- Updated response examples
- Enhanced parameter description

## Security Improvements Summary

| Feature                        | Before       | After                   |
| ------------------------------ | ------------ | ----------------------- |
| File Type Validation           | ❌ None      | ✅ Whitelist (10 types) |
| Filename Sanitization          | ❌ Basic     | ✅ Full sanitization    |
| Directory Traversal Protection | ⚠️ Basic     | ✅ Enhanced             |
| Upload Logging                 | ❌ None      | ✅ User + size          |
| Download Logging               | ❌ None      | ✅ User tracking        |
| Error Messages                 | ⚠️ Generic   | ✅ Specific             |
| Configuration                  | ❌ Hardcoded | ✅ Environment vars     |

## Testing Checklist

### Upload Tests

- [ ] Upload valid image (JPEG, PNG, GIF, WebP)
- [ ] Upload valid PDF
- [ ] Upload valid Office document (DOC, DOCX, XLS, XLSX)
- [ ] Upload invalid file type (executable, script) - should fail
- [ ] Upload file > 20MB - should fail with 413
- [ ] Upload with special characters in filename - should sanitize
- [ ] Upload without file - should fail with 400
- [ ] Verify file saved to correct directory
- [ ] Verify filename is sanitized and unique

### Download Tests

- [ ] Download existing file - should succeed
- [ ] Download non-existent file - should fail with 404
- [ ] Download with directory traversal (../) - should fail with 400
- [ ] Download hidden file (.htaccess) - should fail with 400
- [ ] Verify correct Content-Type header
- [ ] Verify file renders in browser (images, PDFs)

### Security Tests

- [ ] Attempt to upload .exe file - should fail
- [ ] Attempt to upload .sh script - should fail
- [ ] Attempt filename injection (../../etc/passwd) - should sanitize
- [ ] Attempt path traversal in download - should fail
- [ ] Verify all security warnings logged

## Deployment Notes

### Environment Variables

```bash
# Optional - defaults to /app/private_uploads
UPLOAD_DIR=/app/private_uploads
```

### Docker Volume

Ensure docker-compose.yml has:

```yaml
volumes:
  - uploads_data:/app/private_uploads
```

### Permissions

Directory must be writable by node user:

```dockerfile
RUN mkdir -p /app/private_uploads && \
    chmod 755 /app/private_uploads && \
    chown -R node:node /app/private_uploads
```

## Future Enhancements

1. **Virus Scanning**: Integrate ClamAV for uploaded files
2. **Image Optimization**: Auto-resize/compress images
3. **Database Audit**: Store upload/download records in database
4. **File Expiration**: Auto-delete old files
5. **AWS S3 Migration**: Move to cloud storage for scalability
6. **Thumbnail Generation**: Create thumbnails for images
7. **File Encryption**: Encrypt files at rest

## Related Files

- `docker-compose.yml` - Volume configuration
- `Dockerfile` - Directory creation
- `.gitignore` - Exclude uploads from git
- `test-upload-persistence.sh` - Automated testing

## Commit Message

```
feat(backend): enhance upload route security and configuration

Security Improvements:
- Add file type whitelist (10 allowed MIME types)
- Implement filename sanitization to prevent injection
- Enhanced directory traversal protection
- Add upload/download audit logging with user tracking

Configuration:
- Add UPLOAD_DIR environment variable support
- Centralize MAX_FILE_SIZE constant (20MB)
- Better error messages with specific codes

Error Handling:
- Proper Multer error handling (file size, type)
- Enhanced validation for download endpoint
- Detailed error logging for debugging

Documentation:
- Update Swagger docs with all file types
- Add response schemas for upload endpoint
- Document security features

Closes #28
```

## Related Issues

- [x] #28 - Implement Docker Volume fix for file uploads
- [ ] #29 - Add virus scanning to file uploads (future)
- [ ] #30 - Migrate to AWS S3 for file storage (future)
