import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Document } from "mongoose";
import { PrivateKey } from "../enums/privateKey.enum";


export type ApplicationDocument = HydratedDocument<Application>

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
export class Application extends Document {
    @Prop({ unique: true, required: true})
    name: string;

    @Prop({required: true})
    user: string;

    @Prop({unique: true, required: true})
    urlToCallback: string;

    @Prop({unique: true, default: ""})
    clientIdProd: string;

    @Prop({unique: true, default: ""})
    clientIdTest: string;

    @Prop({default: PrivateKey.PROD})
    privateKeyProd: string;

    @Prop({default: PrivateKey.TEST})
    privateKeytest: string;

    @Prop({default: false})
    envProd: boolean;

    @Prop({default: true})
    envTest: boolean;

    @Prop({default: false})
    isDeleted: boolean;
    
    @Prop({default: Date.now(), required: true})
    createdAt: Date;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application)