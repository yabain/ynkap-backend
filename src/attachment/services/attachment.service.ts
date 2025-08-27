import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

// Models
import { Attachment, AttachmentDocument, FileType, UploadStatus } from '../models/attachment.schema';

// Services
import { GoogleCloudStorageService } from './google-cloud-storage.service';
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
    private gcsService: GoogleCloudStorageService,
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
        // Clean up temp file
        await this.gcsService.cleanupTempFile(file.path);
        throw new BadRequestException(`File validation failed: ${validationResult.errors.join(', ')}`);
      }

      // 2. Upload to Google Cloud Storage
      const uploadResult = await this.gcsService.uploadFile(
        file.path,
        file.originalname,
        file.mimetype,
        this.getUploadFolder(createAttachmentDto.ticketId, createAttachmentDto.messageId)
      );

      // 3. Extract metadata
      const metadata = await this.extractFileMetadata(file.path, validationResult.fileType);

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
        gcsFileName: uploadResult.fileName,
        gcsBucket: uploadResult.bucket,
        gcsPath: uploadResult.gcsPath,
        uploadStatus: UploadStatus.COMPLETED,
        metadata,
        metadataExtracted: true
      });

      const savedAttachment = await attachment.save();

      // 5. Generate thumbnail for images (async)
      if (validationResult.fileType === FileType.IMAGE) {
        this.generateThumbnailAsync(savedAttachment._id.toString(), file.path);
      }

      // 6. Clean up temp file
      await this.gcsService.cleanupTempFile(file.path);

      this.logger.log(`✅ File uploaded successfully: ${savedAttachment._id}`);
      return savedAttachment;

    } catch (error) {
      // Clean up temp file on error
      await this.gcsService.cleanupTempFile(file.path);
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
   * Get attachments by user
   */
  async findByUser(userId: string, limit: number = 50): Promise<Attachment[]> {
    return this.attachmentModel
      .find({ uploadedBy: userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Update attachment
   */
  async update(id: string, updateAttachmentDto: UpdateAttachmentDto): Promise<Attachment> {
    const attachment = await this.attachmentModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { ...updateAttachmentDto, updatedAt: new Date() },
        { new: true }
      )
      .exec();

    if (!attachment) {
      throw new NotFoundException(`Attachment with ID ${id} not found`);
    }

    this.logger.log(`✅ Attachment updated: ${id}`);
    return attachment;
  }

  /**
   * Delete attachment (soft delete)
   */
  async delete(id: string, deletedBy: string): Promise<boolean> {
    const attachment = await this.findById(id);

    // Delete from Google Cloud Storage
    try {
      await this.gcsService.deleteFile(attachment.gcsPath);
      
      // Delete thumbnail if exists
      if (attachment.thumbnailUrl) {
        const thumbnailPath = attachment.gcsPath.replace(/\.[^/.]+$/, '_thumb.jpg');
        await this.gcsService.deleteFile(thumbnailPath);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to delete file from GCS: ${attachment.gcsPath}`, error);
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
    
    // For public files, return direct URL
    if (attachment.isPublic) {
      return attachment.url;
    }

    // For private files, generate signed URL
    return this.gcsService.generateSignedUrl(attachment.gcsPath, expirationMinutes);
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(id: string, width: number = 150, height: number = 150): Promise<string> {
    const attachment = await this.findById(id);

    if (attachment.fileType !== FileType.IMAGE) {
      throw new BadRequestException('Thumbnails can only be generated for images');
    }

    if (attachment.thumbnailUrl) {
      return attachment.thumbnailUrl;
    }

    try {
      const thumbnailUrl = await this.thumbnailService.generateThumbnail(
        attachment.gcsPath,
        width,
        height
      );

      // Update attachment with thumbnail URL
      await this.attachmentModel
        .updateOne(
          { _id: id },
          { 
            thumbnailUrl, 
            thumbnailGenerated: true,
            updatedAt: new Date()
          }
        )
        .exec();

      this.logger.log(`✅ Thumbnail generated for attachment: ${id}`);
      return thumbnailUrl;

    } catch (error) {
      this.logger.error(`❌ Failed to generate thumbnail for ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get upload statistics
   */
  async getUploadStats(userId?: string): Promise<any> {
    const matchStage: any = { isDeleted: false };
    if (userId) {
      matchStage.uploadedBy = userId;
    }

    const stats = await this.attachmentModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$fileSize' },
          byType: {
            $push: {
              type: '$fileType',
              size: '$fileSize'
            }
          }
        }
      }
    ]);

    return stats[0] || { totalFiles: 0, totalSize: 0, byType: [] };
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
   * Get upload folder path
   */
  private getUploadFolder(ticketId?: string, messageId?: string): string {
    if (messageId) {
      return `attachments/messages/${messageId}`;
    } else if (ticketId) {
      return `attachments/tickets/${ticketId}`;
    }
    return 'attachments/general';
  }

  /**
   * Generate thumbnail asynchronously
   */
  private async generateThumbnailAsync(attachmentId: string, tempFilePath: string): Promise<void> {
    try {
      setTimeout(async () => {
        try {
          await this.generateThumbnail(attachmentId);
        } catch (error) {
          this.logger.error(`❌ Async thumbnail generation failed for ${attachmentId}:`, error);
        }
      }, 1000);
    } catch (error) {
      this.logger.error(`❌ Failed to schedule thumbnail generation:`, error);
    }
  }
}
