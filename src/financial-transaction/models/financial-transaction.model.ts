import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { FinancialTransactionState, FinancialTransactionErrorType } from '../enum';
import { FinancialTransactionType } from 'src/financial-payment/enum';

@Schema()
export class FinancialTransaction extends Document {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  ref: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop()
  description?: string;

  @Prop({ required: true, enum: FinancialTransactionType })
  type: FinancialTransactionType;

  @Prop({ required: true, enum: FinancialTransactionState })
  state: FinancialTransactionState;

  @Prop()
  userRef?: any;

  @Prop()
  moneyCode?: string;

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;

  @Prop()
  raison?: string;
}

export const FinancialTransactionSchema = SchemaFactory.createForClass(FinancialTransaction);