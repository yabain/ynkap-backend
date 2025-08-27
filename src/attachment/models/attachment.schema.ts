import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Document } from 'mongoose';
import { Ticket } from '../../ticket/models/ticket.schema';
import { Message } from '../../message/models/message.schema';

export type AttachmentDocument = HydratedDocument<Attachment>;

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  ARCHIVE = 'archive',
  OTHER = 'other'
}

export enum UploadStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PROCESSING = 'processing'
}

@Schema({
  toObject: {
    transform: function (doc, ret) {
      delete ret.__v;
      delete ret.isDeleted;
      return ret;
    }
  },
  toJSON: {
    transform: function (doc, ret) {
      delete ret.__v;
      delete ret.isDeleted;
      return ret;
    }
  }
})
export class Attachment extends Document {
  
  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  fileSize: number;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true, enum: FileType })
  fileType: FileType;

  @Prop({ required: true })
  url: string;

  @Prop({ default: null })
  thumbnailUrl: string;

  @Prop({ required: true })
  uploadedBy: string;

  @Prop({ default: () => new Date() })
  uploadedAt: Date;

  // References
  @Prop({ type: mongoose.Types.ObjectId, ref: Message.name, default: null })
  messageId: Message;

  @Prop({ type: mongoose.Types.ObjectId, ref: Ticket.name, default: null })
  ticketId: Ticket;

  @Prop({ default: true })
  isPublic: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  // Google Cloud Storage specific fields
  @Prop({ required: true })
  gcsFileName: string;

  @Prop({ required: true })
  gcsBucket: string;

  @Prop({ default: null })
  gcsPath: string;

  // Upload status and metadata
  @Prop({ default: UploadStatus.COMPLETED, enum: UploadStatus })
  uploadStatus: UploadStatus;

  @Prop({ default: null })
  uploadError: string;

  // File metadata
  @Prop({
    type: {
      width: { type: Number, default: null },
      height: { type: Number, default: null },
      duration: { type: Number, default: null }, // For videos/audio in seconds
      pages: { type: Number, default: null }, // For PDFs
      encoding: { type: String, default: null },
      bitrate: { type: Number, default: null }, // For audio/video
      fps: { type: Number, default: null }, // For videos
      colorSpace: { type: String, default: null }, // For images
      compression: { type: String, default: null }
    },
    default: {}
  })
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    pages?: number;
    encoding?: string;
    bitrate?: number;
    fps?: number;
    colorSpace?: string;
    compression?: string;
  };

  // Security and access control
  @Prop({ default: [] })
  allowedUsers: string[];

  @Prop({ default: null })
  expiresAt: Date;

  // Virus scan results (if implemented)
  @Prop({ default: null })
  virusScanStatus: string;

  @Prop({ default: null })
  virusScanResult: string;

  // File processing status
  @Prop({ default: false })
  thumbnailGenerated: boolean;

  @Prop({ default: false })
  metadataExtracted: boolean;

  // Audit fields
  @Prop({ default: () => new Date() })
  createdAt: Date;

  @Prop({ default: () => new Date() })
  updatedAt: Date;

  @Prop({ default: null })
  deletedAt: Date;

  @Prop({ default: null })
  deletedBy: string;
}

export const AttachmentSchema = SchemaFactory.createForClass(Attachment);

// Indexes for better query performance
AttachmentSchema.index({ messageId: 1 });
AttachmentSchema.index({ ticketId: 1 });
AttachmentSchema.index({ uploadedBy: 1 });
AttachmentSchema.index({ fileType: 1 });
AttachmentSchema.index({ uploadStatus: 1 });
AttachmentSchema.index({ createdAt: -1 });
AttachmentSchema.index({ isDeleted: 1 });

// Compound indexes
AttachmentSchema.index({ ticketId: 1, isDeleted: 1 });
AttachmentSchema.index({ messageId: 1, isDeleted: 1 });
AttachmentSchema.index({ uploadedBy: 1, isDeleted: 1 });

// Pre-save middleware to update timestamps
AttachmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-update middleware to update timestamps
AttachmentSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  this.set({ updatedAt: new Date() });
  next();
});
