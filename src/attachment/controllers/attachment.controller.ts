import {Controller,Get,Post,Body,Patch,Param,Delete,UseInterceptors,UploadedFile,UploadedFiles,Query,Req,BadRequestException} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {  ApiTags,ApiOperation,ApiResponse,ApiConsumes,ApiParam,  ApiQuery,ApiBearerAuth} from '@nestjs/swagger';

// Services
import { AttachmentService } from '../services/attachment.service';
// import { GoogleCloudStorageService } from '../services/google-cloud-storage.service';
import { FileValidationService } from '../services/file-validation.service';

// DTOs
import { CreateAttachmentDto, UploadFileDto, UploadMultipleFilesDto } from '../dto/create-attachment.dto';
import { UpdateAttachmentDto } from '../dto/update-attachment.dto';

// Types
import { MulterFile } from '../types/multer.types';

// Guards (assuming you have authentication)
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Attachments')
@Controller('attachments')
export class AttachmentController {
  constructor(
    private readonly attachmentService: AttachmentService,
    // private readonly gcsService: GoogleCloudStorageService,
    private readonly validationService: FileValidationService
  ) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or validation failed' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: MulterFile,
    @Body() createAttachmentDto: CreateAttachmentDto,
    @Req() req: any
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Get user ID from request (assuming JWT auth)
    const uploadedBy = 'anonymous'; // Temporarily disable auth

    console.log('📁 📤 File upload request:', {
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      ticketId: createAttachmentDto.ticketId,
      messageId: createAttachmentDto.messageId
    });

    return this.attachmentService.uploadFile(file, createAttachmentDto, uploadedBy);
  }

  @Post('upload-multiple')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid files or validation failed' })
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadMultipleFiles(
    @UploadedFiles() files: MulterFile[],
    @Body() createAttachmentDto: CreateAttachmentDto,
    @Req() req: any
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const uploadedBy = 'anonymous'; // Temporarily disable auth

    console.log('📁 📤 Multiple file upload request:', {
      fileCount: files.length,
      files: files.map(f => ({ name: f.originalname, size: f.size })),
      ticketId: createAttachmentDto.ticketId,
      messageId: createAttachmentDto.messageId
    });

    return this.attachmentService.uploadMultipleFiles(files, createAttachmentDto, uploadedBy);
  }

  @Get('config')
  @ApiOperation({ summary: 'Get upload configuration' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved successfully' })
  getConfig() {
    return {
      // gcs: this.gcsService.getConfig(),
      validation: this.validationService.getConfig()
    };
  }

  @Get('ticket/:ticketId')
  @ApiOperation({ summary: 'Get attachments for a ticket' })
  @ApiParam({ name: 'ticketId', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Attachments retrieved successfully' })
  async getTicketAttachments(@Param('ticketId') ticketId: string) {
    console.log('📁 📥 Getting attachments for ticket:', ticketId);
    return this.attachmentService.findByTicketId(ticketId);
  }

  @Get('message/:messageId')
  @ApiOperation({ summary: 'Get attachments for a message' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Attachments retrieved successfully' })
  async getMessageAttachments(@Param('messageId') messageId: string) {
    console.log('📁 📥 Getting attachments for message:', messageId);
    return this.attachmentService.findByMessageId(messageId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get attachments uploaded by a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results' })
  @ApiResponse({ status: 200, description: 'User attachments retrieved successfully' })
  async getUserAttachments(
    @Param('userId') userId: string,
    @Query('limit') limit?: number
  ) {
    return this.attachmentService.findByUser(userId, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get upload statistics' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Query('userId') userId?: string) {
    return this.attachmentService.getUploadStats(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get attachment by ID' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiResponse({ status: 200, description: 'Attachment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async getAttachment(@Param('id') id: string) {
    return this.attachmentService.findById(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get download URL for attachment' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiQuery({ name: 'expires', required: false, description: 'Expiration time in minutes' })
  @ApiResponse({ status: 200, description: 'Download URL generated successfully' })
  async getDownloadUrl(
    @Param('id') id: string,
    @Query('expires') expires?: number
  ) {
    const url = await this.attachmentService.getDownloadUrl(id, expires);
    return { url };
  }

  @Post(':id/thumbnail')
  @ApiOperation({ summary: 'Generate thumbnail for image attachment' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiResponse({ status: 201, description: 'Thumbnail generated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot generate thumbnail for this file type' })
  async generateThumbnail(
    @Param('id') id: string,
    @Body() options: { width?: number; height?: number }
  ) {
    const { width = 150, height = 150 } = options;
    const thumbnailUrl = await this.attachmentService.generateThumbnail(id, width, height);
    return { thumbnailUrl };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update attachment metadata' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiResponse({ status: 200, description: 'Attachment updated successfully' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async updateAttachment(
    @Param('id') id: string,
    @Body() updateAttachmentDto: UpdateAttachmentDto
  ) {
    return this.attachmentService.update(id, updateAttachmentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete attachment' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiResponse({ status: 200, description: 'Attachment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async deleteAttachment(@Param('id') id: string, @Req() req: any) {
    const deletedBy = 'anonymous'; // Temporarily disable auth
    const success = await this.attachmentService.delete(id, deletedBy);
    return { success };
  }
}
