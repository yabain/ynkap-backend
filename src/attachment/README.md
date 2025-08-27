# File Attachment Module

A comprehensive file attachment system with Google Cloud Storage integration for the Y-Nkap backend.

## Features

### ✅ Core Functionality
- **File Upload**: Single and multiple file uploads with progress tracking
- **Google Cloud Storage**: Secure cloud storage with public/private access
- **File Validation**: Comprehensive validation including file signatures, size limits, and security checks
- **Thumbnail Generation**: Automatic thumbnail generation for images using Sharp
- **Metadata Extraction**: Extract and store file metadata (dimensions, duration, etc.)
- **Download URLs**: Generate secure download URLs with expiration

### ✅ Security Features
- **File Type Validation**: MIME type and file signature verification
- **Size Limits**: Configurable file size restrictions
- **Malicious File Detection**: Check for suspicious file patterns
- **Virus Scanning**: Integration ready for antivirus services
- **Access Control**: Public/private file access management

### ✅ Advanced Features
- **Multiple Thumbnail Sizes**: Generate thumbnails in various dimensions
- **Custom Image Processing**: Resize, crop, and optimize images
- **Soft Delete**: Safe deletion with recovery options
- **Upload Statistics**: Track usage and storage metrics
- **Audit Trail**: Complete upload/download history

## Installation

### 1. Install Dependencies

```bash
npm install @google-cloud/storage multer sharp uuid
npm install -D @types/multer @types/sharp @types/uuid
```

### 2. Environment Configuration

Copy `.env.example` and configure:

```bash
# Google Cloud Storage
GCS_PROJECT_ID=your-gcs-project-id
GCS_BUCKET_NAME=your-bucket-name
GCS_KEY_FILENAME=./path/to/service-account-key.json
GCS_PUBLIC_URL=https://storage.googleapis.com

# File Upload Limits
MAX_FILE_SIZE=52428800  # 50MB
MAX_FILES_PER_UPLOAD=10
TEMP_DIR=./uploads/temp

# Security
CHECK_FILE_SIGNATURE=true
SCAN_FOR_VIRUSES=false
```

### 3. Google Cloud Setup

1. Create a Google Cloud Project
2. Enable Cloud Storage API
3. Create a service account with Storage Admin role
4. Download the service account key JSON file
5. Create a storage bucket

### 4. Import Module

```typescript
// app.module.ts
import { AttachmentModule } from './attachment/attachment.module';

@Module({
  imports: [
    AttachmentModule,
    // ... other modules
  ]
})
export class AppModule {}
```

## API Endpoints

### Upload Files

```http
POST /attachments/upload
Content-Type: multipart/form-data

{
  "file": <file>,
  "ticketId": "optional-ticket-id",
  "messageId": "optional-message-id",
  "isPublic": true
}
```

### Upload Multiple Files

```http
POST /attachments/upload-multiple
Content-Type: multipart/form-data

{
  "files": [<file1>, <file2>, ...],
  "ticketId": "optional-ticket-id",
  "messageId": "optional-message-id"
}
```

### Get Attachments

```http
GET /attachments/ticket/:ticketId
GET /attachments/message/:messageId
GET /attachments/user/:userId
GET /attachments/:id
```

### Download & Thumbnails

```http
GET /attachments/:id/download?expires=60
POST /attachments/:id/thumbnail
{
  "width": 150,
  "height": 150
}
```

### Management

```http
PATCH /attachments/:id
DELETE /attachments/:id
GET /attachments/stats
GET /attachments/config
```

## Usage Examples

### Basic File Upload

```typescript
@Controller('example')
export class ExampleController {
  constructor(private attachmentService: AttachmentService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateAttachmentDto
  ) {
    return this.attachmentService.uploadFile(file, dto, 'user-id');
  }
}
```

### Generate Thumbnails

```typescript
// Generate standard thumbnail
const thumbnailUrl = await this.attachmentService.generateThumbnail(
  attachmentId, 
  150, 
  150
);

// Generate custom thumbnail
const customThumbnail = await this.thumbnailService.generateCustomThumbnail(
  gcsPath,
  {
    width: 300,
    height: 200,
    fit: 'cover',
    quality: 90,
    format: 'webp'
  }
);
```

### File Validation

```typescript
const validation = await this.validationService.validateFile(
  filePath,
  originalName,
  mimeType
);

if (!validation.isValid) {
  throw new BadRequestException(validation.errors.join(', '));
}
```

## Database Schema

### Attachment Model

```typescript
{
  _id: ObjectId,
  fileName: string,           // Generated unique filename
  originalName: string,       // Original filename from user
  fileSize: number,          // File size in bytes
  mimeType: string,          // MIME type
  fileType: FileType,        // Enum: IMAGE, VIDEO, AUDIO, DOCUMENT, etc.
  url: string,               // Public URL
  thumbnailUrl?: string,     // Thumbnail URL (for images)
  uploadedBy: string,        // User ID
  uploadedAt: Date,
  messageId?: ObjectId,      // Reference to message
  ticketId?: ObjectId,       // Reference to ticket
  isPublic: boolean,         // Access control
  gcsFileName: string,       // GCS filename
  gcsBucket: string,         // GCS bucket name
  gcsPath: string,          // Full GCS path
  uploadStatus: UploadStatus, // PENDING, COMPLETED, FAILED, etc.
  metadata: {                // File-specific metadata
    width?: number,
    height?: number,
    duration?: number,
    pages?: number,
    // ... more
  },
  // Audit fields
  createdAt: Date,
  updatedAt: Date,
  isDeleted: boolean,
  deletedAt?: Date,
  deletedBy?: string
}
```

## Configuration

### File Validation Config

```typescript
{
  maxFileSize: 50 * 1024 * 1024,  // 50MB
  allowedMimeTypes: [
    'image/jpeg', 'image/png', 'image/gif',
    'application/pdf', 'text/plain',
    // ... more
  ],
  allowedExtensions: [
    '.jpg', '.png', '.gif', '.pdf', '.txt',
    // ... more
  ],
  maxFiles: 10,
  scanForViruses: false,
  checkFileSignature: true
}
```

### Google Cloud Config

```typescript
{
  projectId: 'your-project',
  bucketName: 'your-bucket',
  keyFilename: './service-account.json',
  publicUrl: 'https://storage.googleapis.com'
}
```

## Error Handling

The module provides comprehensive error handling:

- **ValidationException**: File validation failures
- **UploadException**: GCS upload failures
- **NotFoundException**: Attachment not found
- **BadRequestException**: Invalid requests
- **InternalServerException**: System errors

## Monitoring & Logging

All operations are logged with structured logging:

```
📁 📤 File upload request: document.pdf (2.5MB)
📁 ✅ File uploaded successfully: 507f1f77bcf86cd799439011
📁 🖼️ Generating thumbnail for: attachments/images/uuid.jpg
📁 ✅ Thumbnail generated: https://storage.googleapis.com/...
```

## Testing

```bash
# Unit tests
npm run test attachment

# E2E tests
npm run test:e2e attachment

# Coverage
npm run test:cov
```

## Performance Considerations

- **Async Processing**: Thumbnails generated asynchronously
- **Streaming**: Large file uploads use streaming
- **Caching**: Metadata and URLs cached when possible
- **Cleanup**: Temporary files automatically cleaned up
- **Indexing**: Database indexes for common queries

## Security Best Practices

1. **File Validation**: Always validate file types and signatures
2. **Size Limits**: Enforce reasonable file size limits
3. **Access Control**: Use proper authentication and authorization
4. **Virus Scanning**: Enable virus scanning for production
5. **HTTPS**: Always use HTTPS for file uploads
6. **Signed URLs**: Use signed URLs for private files

## Troubleshooting

### Common Issues

1. **GCS Authentication**: Ensure service account has proper permissions
2. **File Size**: Check both application and server limits
3. **MIME Types**: Verify allowed MIME types configuration
4. **Temp Directory**: Ensure temp directory exists and is writable
5. **Sharp Installation**: Sharp may need platform-specific binaries

### Debug Logging

Enable debug logging:

```bash
LOG_LEVEL=debug npm run start:dev
```

## Contributing

1. Follow NestJS conventions
2. Add comprehensive tests
3. Update documentation
4. Use structured logging
5. Handle errors gracefully
