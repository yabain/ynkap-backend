import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { LogLevel } from '../enums/log-level.enum';
import { LogType } from '../enums/log-type.enum';

@Schema({ timestamps: true })
export class Log extends Document {
  @Prop({ required: true, enum: LogLevel, default: LogLevel.INFO })
  level: LogLevel;

  @Prop({ required: true, enum: LogType, default: LogType.ACTIVITY })
  type: LogType;

  @Prop({ required: true })
  message: string;

  @Prop({ default: 'system' })
  user: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const LogSchema = SchemaFactory.createForClass(Log);
