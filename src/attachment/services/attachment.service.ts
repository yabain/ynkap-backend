import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

// Models
import { Attachment, AttachmentDocument, FileType, UploadStatus } from '../models/attachment.schema';

// Services
import { FileValidationService } from './file-validation.service';
import { ThumbnailService } from './thumbnail.service';

// DTOs
import { CreateAttachmentDto } from '../dto/create-attachment.dto';
import { UpdateAttachmentDto } from '../dto/update-attachment.dto';

// Types
import { MulterFile } from '../types/multer.types';

@Injectable()
export class AttachmentService {
  private readonly logger = new Logger(AttachmentService.name);

  constructor(
    @InjectModel(Attachment.name) private attachmentModel: Model<AttachmentDocument>,
    private validationService: FileValidationService,
    private thumbnailService: ThumbnailService
  ) {}

  /**
   * Upload and create attachment
   */
  async uploadFile(
    file: MulterFile,
    createAttachmentDto: CreateAttachmentDto,
    uploadedBy: string
  ): Promise<Attachment> {
    this.logger.log(`📤 Starting file upload: ${file.originalname}`);

    try {
      // 1. Validate file
      const validationResult = await this.validationService.validateFile(
        file.path,
        file.originalname,
        file.mimetype
      );

      if (!validationResult.isValid) {
        await this.cleanupTempFile(file.path);
        throw new BadRequestException(`File validation failed: ${validationResult.errors.join(', ')}`);
      }

      // 2. Move file to permanent uploads directory
      const uploadResult = await this.moveToPermanentDirectory(
        file.path,
        file.originalname
      );

      // 3. Extract metadata
      const metadata = await this.extractFileMetadata(uploadResult.filePath, validationResult.fileType);

      // 4. Create attachment record
      const attachment = new this.attachmentModel({
        fileName: uploadResult.fileName,
        originalName: file.originalname,
        fileSize: uploadResult.size,
        mimeType: file.mimetype,
        fileType: validationResult.fileType,
        url: uploadResult.url,
        uploadedBy,
        messageId: createAttachmentDto.messageId || null,
        ticketId: createAttachmentDto.ticketId || null,
        isPublic: createAttachmentDto.isPublic ?? true,
        filePath: uploadResult.filePath,
        uploadStatus: UploadStatus.COMPLETED,
        metadata,
        metadataExtracted: true
      });

      const savedAttachment = await attachment.save();

      // 5. Generate thumbnail for images (async)
      if (validationResult.fileType === FileType.IMAGE) {
        this.generateThumbnailAsync(savedAttachment._id.toString(), uploadResult.filePath);
      }

      this.logger.log(`✅ File uploaded successfully: ${savedAttachment._id}`);
      return savedAttachment;

    } catch (error) {
      await this.cleanupTempFile(file.path);
      this.logger.error(`❌ File upload failed: ${file.originalname}`, error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: MulterFile[],
    createAttachmentDto: CreateAttachmentDto,
    uploadedBy: string
  ): Promise<Attachment[]> {
    this.logger.log(`📤 Starting multiple file upload: ${files.length} files`);

    const results: Attachment[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const attachment = await this.uploadFile(file, createAttachmentDto, uploadedBy);
        results.push(attachment);
      } catch (error) {
        this.logger.error(`❌ Failed to upload file ${file.originalname}:`, error);
        errors.push(`${file.originalname}: ${error.message}`);
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new BadRequestException(`All file uploads failed: ${errors.join(', ')}`);
    }

    if (errors.length > 0) {
      this.logger.warn(`⚠️ Some files failed to upload: ${errors.join(', ')}`);
    }

    this.logger.log(`✅ Multiple file upload completed: ${results.length}/${files.length} successful`);
    return results;
  }

  /**
   * Get attachment by ID
   */
  async findById(id: string): Promise<Attachment> {
    const attachment = await this.attachmentModel
      .findOne({ _id: id, isDeleted: false })
      .populate('messageId')
      .populate('ticketId')
      .exec();

    if (!attachment) {
      throw new NotFoundException(`Attachment with ID ${id} not found`);
    }

    return attachment;
  }

  /**
   * Get attachments by ticket ID
   */
  async findByTicketId(ticketId: string): Promise<Attachment[]> {
    return this.attachmentModel
      .find({ ticketId, isDeleted: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get attachments by message ID
   */
  async findByMessageId(messageId: string): Promise<Attachment[]> {
    return this.attachmentModel
      .find({ messageId, isDeleted: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Delete attachment (soft delete)
   */
  async delete(id: string, deletedBy: string): Promise<boolean> {
    const attachment = await this.findById(id);

    // Delete from local storage
    try {
      if (attachment.filePath && fs.existsSync(attachment.filePath)) {
        fs.unlinkSync(attachment.filePath);
      }
      
      // Delete thumbnail if exists
      if (attachment.thumbnailUrl) {
        const thumbnailPath = attachment.filePath?.replace(/\.[^/.]+$/, '_thumb.jpg');
        if (thumbnailPath && fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      }
    } catch (error) {
      this.logger.error(`❌ Failed to delete file: ${attachment.filePath}`, error);
    }

    // Soft delete in database
    await this.attachmentModel
      .updateOne(
        { _id: id },
        { 
          isDeleted: true, 
          deletedAt: new Date(), 
          deletedBy,
          updatedAt: new Date()
        }
      )
      .exec();

    this.logger.log(`✅ Attachment deleted: ${id}`);
    return true;
  }

  /**
   * Generate download URL
   */
  async getDownloadUrl(id: string, expirationMinutes: number = 60): Promise<string> {
    const attachment = await this.findById(id);
    return attachment.url;
  }

  /**
   * Move file to permanent uploads directory
   */
  private async moveToPermanentDirectory(
    tempFilePath: string,
    originalName: string
  ): Promise<{ url: string; filePath: string; fileName: string; size: number }> {
    // Use the attachments directory
    const uploadsDir = path.join(process.cwd(), 'uploads', 'attachments');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const fileName = `${baseName}_${timestamp}${ext}`;
    const finalPath = path.join(uploadsDir, fileName);

    // Move file
    fs.renameSync(tempFilePath, finalPath);
    
    // Get file size
    const stats = fs.statSync(finalPath);
    
    return {
      url: `/uploads/attachments/${fileName}`,
      filePath: finalPath,
      fileName: fileName,
      size: stats.size
    };
  }

  /**
   * Extract file metadata
   */
  private async extractFileMetadata(filePath: string, fileType: FileType): Promise<any> {
    const metadata: any = {};

    try {
      // Basic file stats
      const stats = fs.statSync(filePath);
      
      // TODO: Add specific metadata extraction based on file type
      return metadata;
    } catch (error) {
      this.logger.error('❌ Failed to extract metadata:', error);
      return {};
    }
  }

  /**
   * Generate thumbnail asynchronously
   */
  private async generateThumbnailAsync(attachmentId: string, filePath: string): Promise<void> {
    try {
      setTimeout(async () => {
        try {
          // Generate thumbnail logic here
        } catch (error) {
          this.logger.error(`❌ Async thumbnail generation failed for ${attachmentId}:`, error);
        }
      }, 1000);
    } catch (error) {
      this.logger.error(`❌ Failed to schedule thumbnail generation:`, error);
    }
  }

  /**
   * Find attachments by user
   */
  async findByUser(userId: string, limit: number = 50): Promise<Attachment[]> {
    return this.attachmentModel
      .find({ uploadedBy: userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get upload statistics for user
   */
  async getUploadStats(userId: string): Promise<any> {
    const stats = await this.attachmentModel.aggregate([
      { $match: { uploadedBy: userId, isDeleted: false } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$fileSize' },
          fileTypes: { $addToSet: '$fileType' }
        }
      }
    ]);

    return stats[0] || { totalFiles: 0, totalSize: 0, fileTypes: [] };
  }

  /**
   * Generate thumbnail for attachment
   */
  async generateThumbnail(id: string, width: number = 200, height: number = 200): Promise<string> {
    const attachment = await this.findById(id);
    
    if (attachment.fileType !== FileType.IMAGE) {
      throw new BadRequestException('Thumbnails can only be generated for images');
    }

    try {
      const thumbnailUrl = await this.thumbnailService.generateThumbnail(
        attachment.filePath,
        width,
        height
      );
      
      // Update attachment with thumbnail URL
      await this.attachmentModel.updateOne(
        { _id: id },
        { thumbnailUrl, updatedAt: new Date() }
      );
      
      return thumbnailUrl;
    } catch (error) {
      this.logger.error(`❌ Failed to generate thumbnail for ${id}:`, error);
      throw new BadRequestException('Failed to generate thumbnail');
    }
  }

  /**
   * Update attachment
   */
  async update(id: string, updateAttachmentDto: UpdateAttachmentDto): Promise<Attachment> {
    const attachment = await this.findById(id);
    
    const updatedAttachment = await this.attachmentModel
      .findByIdAndUpdate(
        id,
        { ...updateAttachmentDto, updatedAt: new Date() },
        { new: true }
      )
      .exec();

    if (!updatedAttachment) {
      throw new NotFoundException(`Attachment with ID ${id} not found`);
    }

    return updatedAttachment;
  }

  /**
   * Link attachments to a ticket and its first message
   */
  async linkAttachmentsToTicket(
    attachmentIds: string[],
    ticketId: string,
    messageId?: string
  ): Promise<void> {
    if (!attachmentIds || attachmentIds.length === 0) {
      return;
    }

    try {
      const updateData: any = { ticketId, updatedAt: new Date() };
      if (messageId) {
        updateData.messageId = messageId;
      }

      await this.attachmentModel.updateMany(
        { _id: { $in: attachmentIds }, isDeleted: false },
        updateData
      );

      this.logger.log(`✅ Linked ${attachmentIds.length} attachments to ticket ${ticketId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to link attachments to ticket:`, error);
      throw error;
    }
  }

  /**
   * Get attachment details for IDs
   */
  async getAttachmentDetails(attachmentIds: string[]): Promise<any[]> {
    if (!attachmentIds || attachmentIds.length === 0) {
      return [];
    }

    const attachments = await this.attachmentModel
      .find({ _id: { $in: attachmentIds }, isDeleted: false })
      .select('_id fileName originalName fileType fileSize url thumbnailUrl')
      .exec();

    return attachments.map(att => ({
      attachmentId: att._id.toString(),
      fileName: att.originalName,
      fileType: att.fileType,
      fileSize: att.fileSize,
      url: att.url,
      thumbnailUrl: att.thumbnailUrl
    }));
  }

  /**
   * Clean up temporary file
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`✅ Temp file cleaned up: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to clean up temp file: ${filePath}`, error);
    }
  }
}