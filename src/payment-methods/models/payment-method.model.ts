import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Document } from "mongoose";
import { PaymentMethodsTypes } from "../enums/payment-methods-type.enum";

export type PaymentMethodDocument = HydratedDocument<PaymentMethod>;

@Schema({
    toObject: {
        transform: function (doc, ret) {
            delete ret.__v;
        }
    },
    toJSON: {
        transform: function (dot, ret) {
            delete ret.__v;
        }
    }
})
export class PaymentMethod extends Document{

    @Prop({require: true, unique: true})
    name: string;

    @Prop({required: true})
    logo: string;

    @Prop({required: true})
    type: PaymentMethodsTypes 

    @Prop({default: false})
    active: boolean;

    @Prop({default: false})
    isDeleted: boolean;
        
    @Prop({default: () => Date.now()})
    createdAt: Date;
    
}

export const paymentMethodSchema = SchemaFactory.createForClass(PaymentMethod)