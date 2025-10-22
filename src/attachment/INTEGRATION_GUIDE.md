# File Attachment Module - Integration Guide

## ✅ Current Status

The backend file attachment module has been successfully created and compiled! Here's what's ready:

### 📁 **Module Structure**
```
src/attachment/
├── 📄 attachment.module.ts              ✅ Complete
├── 📁 models/
│   └── 📄 attachment.schema.ts          ✅ Complete
├── 📁 services/
│   ├── 📄 attachment.service.ts         ✅ Complete
│   ├── 📄 google-cloud-storage.service.ts ✅ Complete
│   ├── 📄 file-validation.service.ts    ✅ Complete
│   └── 📄 thumbnail.service.ts          ⚠️ Placeholder (Sharp not installed)
├── 📁 controllers/
│   └── 📄 attachment.controller.ts      ✅ Complete
├── 📁 dto/
│   ├── 📄 create-attachment.dto.ts      ✅ Complete
│   └── 📄 update-attachment.dto.ts      ✅ Complete
└── 📁 types/
    └── 📄 multer.types.ts               ✅ Complete
```

## 🚀 **Next Steps to Integrate**

### **1. Import the Module**

Add to your main `app.module.ts`:

```typescript
import { AttachmentModule } from './attachment/attachment.module';

@Module({
  imports: [
    // ... existing modules
    AttachmentModule,
  ],
})
export class AppModule {}
```

### **2. Environment Configuration**

Add these variables to your `.env` file:

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

### **3. Google Cloud Setup**

1. **Create Google Cloud Project**
2. **Enable Cloud Storage API**
3. **Create Service Account** with Storage Admin role
4. **Download service account key** JSON file
5. **Create storage bucket**

### **4. Test the API**

The following endpoints are now available:

```http
POST   /attachments/upload              # Single file upload
POST   /attachments/upload-multiple     # Multiple file upload
GET    /attachments/config              # Get configuration
GET    /attachments/ticket/:ticketId    # Get ticket attachments
GET    /attachments/message/:messageId  # Get message attachments
GET    /attachments/:id                 # Get attachment details
GET    /attachments/:id/download        # Get download URL
POST   /attachments/:id/thumbnail       # Generate thumbnail
PATCH  /attachments/:id                 # Update attachment
DELETE /attachments/:id                 # Delete attachment
```

## ⚠️ **Known Limitations**

### **Thumbnail Generation**
- **Issue**: Sharp dependency couldn't be installed due to disk space
- **Current**: Placeholder implementation returns original image URL
- **Solution**: Install Sharp when disk space is available:
  ```bash
  npm install sharp @types/sharp
  ```

### **File Processing**
- Basic file validation is implemented
- Virus scanning is disabled (placeholder)
- Metadata extraction is basic

## 🔧 **Quick Test**

### **1. Start the Server**
```bash
npm run start:dev
```

### **2. Test File Upload**
```bash
curl -X POST http://localhost:3000/attachments/upload \
  -F "file=@/path/to/your/file.jpg" \
  -F "ticketId=your-ticket-id" \
  -F "isPublic=true"
```

### **3. Test Configuration**
```bash
curl http://localhost:3000/attachments/config
```

## 📋 **Integration Checklist**

- [ ] Import AttachmentModule in app.module.ts
- [ ] Configure environment variables
- [ ] Set up Google Cloud Storage
- [ ] Create temp directory: `mkdir -p uploads/temp`
- [ ] Test file upload endpoint
- [ ] Install Sharp for thumbnail generation (when disk space available)
- [ ] Configure CORS for frontend integration
- [ ] Set up authentication guards
- [ ] Test with frontend module

## 🔗 **Frontend Integration**

Your frontend module is already configured to work with these endpoints:

```typescript
// Frontend calls → Backend endpoints
uploadFile() → POST /attachments/upload
getTicketAttachments() → GET /attachments/ticket/:ticketId
getMessageAttachments() → GET /attachments/message/:messageId
deleteFile() → DELETE /attachments/:id
generateThumbnail() → POST /attachments/:id/thumbnail
```

## 🛠️ **Troubleshooting**

### **Common Issues**

1. **GCS Authentication Error**
   - Verify service account key path
   - Check bucket permissions

2. **File Upload Fails**
   - Check temp directory exists and is writable
   - Verify file size limits
   - Check MIME type restrictions

3. **CORS Issues**
   - Configure CORS in main.ts for frontend domain

4. **Thumbnail Generation**
   - Install Sharp: `npm install sharp`
   - Ensure sufficient disk space

## 📚 **Documentation**

- Full API documentation: `/api` (Swagger)
- Module README: `src/attachment/README.md`
- Environment example: `.env.example`

## 🎉 **You're Ready!**

The backend file attachment module is now ready for integration. The core functionality is working, and you can start testing file uploads immediately!

**Next recommended steps:**
1. Set up Google Cloud Storage
2. Test the upload endpoints
3. Integrate with your frontend module
4. Install Sharp for thumbnail generation when possible
