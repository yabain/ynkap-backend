import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';

export type ApplicationKeyDocument = ApplicationKey & Document;

@Schema({ timestamps: true })
export class ApplicationKey extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true })
  applicationId: string;

  @Prop({ required: true, unique: true })
  clientId: string;

  @Prop({ required: true })
  privateKeyHash: string;

  @Prop({ required: true, enum: ['test', 'prod'] })
  environment: 'test' | 'prod';

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  expiresAt?: Date;

  @Prop()
  lastUsedAt?: Date;

  @Prop({ type: Object })
  permissions?: {
    payments: boolean;
    wallet: boolean;
    messages: boolean;
    [key: string]: boolean;
  };

  @Prop([String])
  ipWhitelist?: string[];

  @Prop({ 
    type: {
      requestsPerMinute: { type: Number, required: true },
      requestsPerHour: { type: Number, required: true }
    }
  })
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

export const ApplicationKeySchema = SchemaFactory.createForClass(ApplicationKey);

