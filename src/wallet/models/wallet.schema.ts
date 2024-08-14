import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument, Document } from "mongoose";
import { Application } from "src/application/models/application.schema";

export type WalletDocument = HydratedDocument<Wallet>

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
export class Wallet extends Document {
    @Prop({default: 0})
    amount: number;

    @Prop({type: mongoose.Types.ObjectId, ref: Application.name})
    application: Application;

    @Prop({default: false})
    isDeleted: boolean;

    @Prop({default: Date.now(), required: true})
    createdAt: Date;

}

export const WalletSchema = SchemaFactory.createForClass(Wallet)