import { Prop, Schema,raw, SchemaFactory } from "@nestjs/mongoose";
import mongoose , { Document, HydratedDocument } from "mongoose";
import { v4 as uuidv4 } from 'uuid';
import { FinancialTransactionErrorType, FinancialTransactionState } from "../enum";
import { Application } from "../../application/models";
import { Wallet } from "../../wallet/models";
import { FinancialTransactionType, PaymentStrategyType, PaymentMoneyCode } from "src/financial-payment/enum";
import { UtilsFunc } from "../utils/utils-func";

export type FinancialTransactionDocument =  HydratedDocument<FinancialTransaction>;


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
export class FinancialTransaction extends Document
{
    @Prop({required:true,enum:FinancialTransactionState,default:FinancialTransactionState.FINANCIAL_TRANSACTION_START})
    state:FinancialTransactionState;

    @Prop({required:true,type:Date,default:Date.now})
    startDate:string;

    @Prop({required:true,type:Date,default:Date.now})
    endDate:String;

    @Prop({required:true,default:0})
    amount:number;

    @Prop({required:true,default:""})
    raison:string;

    @Prop({required:true,enum:FinancialTransactionType,default:FinancialTransactionType.DEPOSIT})
    type:FinancialTransactionType;
    
    @Prop({required:true,default:UtilsFunc.generateUniqueRef()})
    ref:string;

    @Prop({default:""})
    token:string;

    @Prop({required:true,enum:FinancialTransactionErrorType,default:FinancialTransactionErrorType.NO_ERROR})
    error:FinancialTransactionErrorType;

    @Prop({required:true,enum:PaymentStrategyType,default:PaymentStrategyType.BANK})
    paymentMode:PaymentStrategyType;

    @Prop({type:mongoose.Schema.Types.ObjectId,ref:Application.name, required:true})
    application:Application;

    @Prop({required:true,enum:PaymentMoneyCode,default:PaymentMoneyCode.XAF})
    moneyCode:string;

    @Prop(raw({
        fullName:{type:String},
        account:{type:Object}
    }))
    userRef:Record<string,any>;

    @Prop({type:mongoose.Schema.Types.ObjectId,ref:Wallet.name, required:true})
    wallet:Wallet;

    @Prop({default:Date.now(),required:true})
    createdAt:Date
}

export const FinancialTransactionSchema = SchemaFactory.createForClass(FinancialTransaction)
