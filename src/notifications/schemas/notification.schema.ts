import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { NotificationType } from '../dto/create-notification.dto';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ 
    type: String, 
    enum: Object.values(NotificationType), 
    default: NotificationType.INFO 
  })
  type: NotificationType;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  relatedEntityId?: string;

  @Prop()
  relatedEntityType?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  readAt?: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Index for faster querying
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
