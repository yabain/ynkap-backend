# File Attachment Implementation Guide

## Overview
This implementation allows files to be attached to tickets and automatically links them to the first message in the ticket's chat. Files are stored in the `uploads/temp` directory as specified in the configuration.

## Key Features

### 1. File Storage Location
- Files are stored in `uploads/temp` directory (configurable via `TEMP_DIR` environment variable)
- Default path: `./uploads/temp`

### 2. Ticket Creation with Attachments
When creating a ticket, you can now include attachments that will be:
- Attached to the ticket itself
- Automatically attached to the first message (description message)

### 3. Message Attachments
When adding messages to tickets, attachments are:
- Linked to the specific message
- Also linked to the parent ticket

## API Usage

### 1. Upload Files First
Before creating a ticket or adding a message, upload files using the attachment endpoint:

```bash
POST /attachments/upload
Content-Type: multipart/form-data

# Form data:
# - file: [file to upload]
# - ticketId: (optional - can be set later)
# - messageId: (optional - can be set later)
# - isPublic: true/false
```

Response:
```json
{
  "_id": "attachment_id_here",
  "fileName": "document_1234567890.pdf",
  "originalName": "document.pdf",
  "fileSize": 1024000,
  "mimeType": "application/pdf",
  "fileType": "document",
  "url": "/uploads/temp/document_1234567890.pdf",
  "uploadedBy": "user_id",
  "uploadStatus": "completed"
}
```

### 2. Create Ticket with Attachments
```bash
POST /tickets
Content-Type: application/json

{
  "title": "Bug report with screenshots",
  "description": "I found a bug in the application. Please see attached screenshots.",
  "type": "BUG",
  "attachments": ["attachment_id_1", "attachment_id_2"]
}
```

### 3. Add Message with Attachments
```bash
POST /tickets/{ticketId}/messages
Content-Type: application/json

{
  "content": "Here are additional files for this issue",
  "attachments": ["attachment_id_3", "attachment_id_4"]
}
```

## Database Schema Changes

### Ticket Schema
- `attachments: string[]` - Array of attachment IDs linked to the ticket
- `messages[].attachments: string[]` - Array of attachment IDs for each message
- `messages[].attachmentDetails` - Embedded attachment details for quick access

### Attachment Schema
- `ticketId` - Reference to the parent ticket
- `messageId` - Reference to the specific message (optional)
- `filePath` - Local file system path in temp directory
- `url` - Public URL for file access

## File Workflow

1. **Upload**: Files are uploaded to `/uploads/temp/` directory
2. **Link**: When creating tickets/messages, attachment IDs are provided
3. **Associate**: Attachments are linked to both ticket and message
4. **Access**: Files remain in temp directory and can be accessed via URL

## Configuration

The following environment variables control file handling:

```env
# File Upload Configuration
TEMP_DIR=./uploads/temp
MAX_FILE_SIZE=52428800  # 50MB
MAX_FILES_PER_UPLOAD=10

# File Validation
CHECK_FILE_SIGNATURE=true
SCAN_FOR_VIRUSES=false
```

## Implementation Details

### Service Integration
- `AttachmentService` handles file operations
- `TicketService` manages ticket-attachment relationships
- Circular dependency resolved using `forwardRef()`

### Key Methods Added
- `AttachmentService.linkAttachmentsToTicket()` - Links attachments to tickets
- `AttachmentService.getAttachmentDetails()` - Gets attachment metadata
- `TicketService` updated to handle attachments in creation and messaging

### File Types Supported
- Images: JPEG, PNG, GIF, WebP, SVG
- Documents: PDF, Word, Excel, PowerPoint
- Text: Plain text, CSV
- Archives: ZIP, RAR, 7Z
- Media: MP4, AVI, MOV, MP3, WAV, OGG

## Security Considerations

1. **File Validation**: Files are validated for type and size
2. **Virus Scanning**: Optional virus scanning (configurable)
3. **Access Control**: Attachments inherit ticket permissions
4. **File Signatures**: Optional file signature checking

## Usage Example

```typescript
// 1. Upload file
const formData = new FormData();
formData.append('file', fileBlob);
const uploadResponse = await fetch('/attachments/upload', {
  method: 'POST',
  body: formData
});
const attachment = await uploadResponse.json();

// 2. Create ticket with attachment
const ticketResponse = await fetch('/tickets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Issue with file attachment',
    description: 'Please see attached file for details',
    type: 'BUG',
    attachments: [attachment._id]
  })
});
```

## Notes

- Files are kept in the temp directory as requested
- Attachments are automatically linked to the first message when creating tickets
- The system supports both single and multiple file uploads
- File metadata is embedded in messages for quick access without additional queries