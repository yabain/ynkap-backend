import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';

export type KeyAuditDocument = KeyAudit & Document;

export enum AuditEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  KEY_REGENERATED = 'KEY_REGENERATED',
  KEY_ROTATED = 'KEY_ROTATED',
  CREDENTIALS_ACCESSED = 'CREDENTIALS_ACCESSED',
  INVALID_CLIENT_ID = 'INVALID_CLIENT_ID',
  INVALID_PRIVATE_KEY = 'INVALID_PRIVATE_KEY',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN'
}

@Schema({ timestamps: true })
export class KeyAudit extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true })
  applicationId: string;

  @Prop({ required: true, enum: AuditEventType })
  eventType: AuditEventType;

  @Prop({ required: true })
  clientId: string;

  @Prop({ required: true })
  environment: 'test' | 'prod';

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ required: true })
  userAgent: string;

  @Prop({ default: true })
  success: boolean;

  @Prop()
  errorMessage?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const KeyAuditSchema = SchemaFactory.createForClass(KeyAudit);
