import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { LogLevel } from '../enums/log-level.enum';
import { LogType } from '../enums/log-type.enum';

export type LogDocument = Log & Document;

@Schema({
  collection: 'logs',
  timestamps: true,
  // Définir des options pour limiter la taille des documents
  toJSON: {
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    }
  }
})
export class Log {
  @Prop({ required: true, enum: LogLevel })
  level: LogLevel;

  @Prop({ required: true, enum: LogType })
  type: LogType;

  @Prop({ required: true, maxlength: 10000 })
  message: string;

  @Prop()
  user?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now, index: true })
  createdAt: Date;
}

export const LogSchema = SchemaFactory.createForClass(Log);

// Ajouter un index sur createdAt pour améliorer les performances de tri
LogSchema.index({ createdAt: -1 });
LogSchema.index({ type: 1, createdAt: -1 });







