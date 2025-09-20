import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type TransactionLogDocument = HydratedDocument<TransactionLog>;

@Schema({
  toObject: {
    transform: function (doc, ret) {
      delete ret.__v;
    }
  },
  toJSON: {
    transform: function (doc, ret) {
      delete ret.__v;
    }
  }
})
export class TransactionLog extends Document {
  @Prop()
  transactionId: string;

  @Prop({ required: true })
  action: string;

  @Prop({ type: Object })
  details: any;

  @Prop()
  applicationId: string;

  @Prop()
  userId: string;

  @Prop({ default: 'INFO' })
  status: string;

  @Prop()
  amount: number;

  @Prop()
  paymentMethod: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const TransactionLogSchema = SchemaFactory.createForClass(TransactionLog);