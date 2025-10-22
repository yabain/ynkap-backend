# AWS S3 File Upload Setup Guide

This guide will help you set up AWS S3 for file uploads in the Y-Nkap chat system.

## Prerequisites

1. AWS Account
2. AWS CLI installed and configured (optional but recommended)
3. Node.js and npm installed

## Step 1: Install Dependencies

```bash
cd ynkap-backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer uuid
```

## Step 2: AWS S3 Setup

### 2.1 Create an S3 Bucket

1. Log in to AWS Console
2. Navigate to S3 service
3. Click "Create bucket"
4. Choose a unique bucket name (e.g., `ynkap-chat-files-2024`)
5. Select your preferred region (e.g., `us-east-1`)
6. Configure bucket settings:
   - **Block Public Access**: Uncheck "Block all public access" if you want public file access
   - **Bucket Versioning**: Enable if needed
   - **Default encryption**: Enable with AES-256 or AWS KMS

### 2.2 Create IAM User and Access Keys

1. Navigate to IAM service in AWS Console
2. Click "Users" → "Create user"
3. Username: `ynkap-s3-user`
4. Attach policies directly:
   - `AmazonS3FullAccess` (for development)
   - Or create a custom policy with minimal permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket-name",
                "arn:aws:s3:::your-bucket-name/*"
            ]
        }
    ]
}
```

5. Create access keys:
   - Go to "Security credentials" tab
   - Click "Create access key"
   - Choose "Application running outside AWS"
   - Save the Access Key ID and Secret Access Key

## Step 3: Environment Configuration

Add these variables to your `.env` file:

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_S3_BUCKET_NAME=your-s3-bucket-name
AWS_S3_PUBLIC_URL=https://your-s3-bucket-name.s3.us-east-1.amazonaws.com

# File Upload Configuration
MAX_FILE_SIZE=52428800  # 50MB
MAX_FILES_PER_UPLOAD=10
TEMP_DIR=./uploads/temp

# Security
CHECK_FILE_SIGNATURE=true
SCAN_FOR_VIRUSES=false
```

## Step 4: Bucket Policy (Optional)

If you want public read access to uploaded files, add this bucket policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

## Step 5: CORS Configuration

Add CORS configuration to your S3 bucket:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"]
    }
]
```

## Step 6: Test the Setup

1. Start your backend server:
   ```bash
   npm run start:dev
   ```

2. Test file upload via the chat interface
3. Check your S3 bucket to verify files are uploaded

## Features

### Supported File Types
- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Videos**: MP4, AVI, MOV, WMV, WebM
- **Audio**: MP3, WAV, OGG, M4A
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV
- **Archives**: ZIP, RAR, 7Z

### File Display Features
- **Images**: Thumbnail preview with click-to-expand modal
- **Videos**: Embedded video player with controls
- **Audio**: Audio player with controls
- **Documents**: File icon with download and open options

### Security Features
- File type validation
- File size limits (50MB default)
- File signature verification
- Secure S3 URLs with expiration

## Troubleshooting

### Common Issues

1. **Access Denied Error**
   - Check IAM user permissions
   - Verify bucket policy
   - Ensure access keys are correct

2. **CORS Errors**
   - Update S3 bucket CORS configuration
   - Check allowed origins in CORS policy

3. **File Upload Fails**
   - Check file size limits
   - Verify file type is allowed
   - Check network connectivity

4. **Files Not Displaying**
   - Verify S3 bucket is public (if using public URLs)
   - Check CORS configuration
   - Verify file URLs are correct

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
```

This will show detailed logs for file upload operations.

## Production Considerations

1. **Security**
   - Use IAM roles instead of access keys when possible
   - Implement proper access controls
   - Enable CloudTrail for audit logging

2. **Performance**
   - Use CloudFront CDN for better performance
   - Implement file compression
   - Consider using S3 Transfer Acceleration

3. **Cost Optimization**
   - Set up lifecycle policies for old files
   - Use appropriate storage classes
   - Monitor usage with AWS Cost Explorer

4. **Monitoring**
   - Set up CloudWatch alarms
   - Monitor S3 metrics
   - Track file upload success rates
