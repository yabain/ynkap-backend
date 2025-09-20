import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { FinancialTransactionState } from 'src/financial-transaction/enum';
import { FinancialTransactionType, PaymentStrategyType } from 'src/financial-payment/enum';

export type TransactionLogDocument = TransactionLog & Document;

@Schema({ timestamps: true })
export class TransactionLog {
  @Prop({ required: true })
  transactionId: string;

  @Prop({ required: true })
  applicationId: string;

  @Prop({ required: true })
  state: string;

  @Prop()
  type: string;

  @Prop()
  amount: number;

  @Prop()
  paymentMode: string;

  @Prop({ default: 'anonymous' })
  userId: string;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const TransactionLogSchema = SchemaFactory.createForClass(TransactionLog);
