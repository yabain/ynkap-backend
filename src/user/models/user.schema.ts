import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument } from "mongoose";

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User extends Document {
    @Prop({unique: true})
    sub: string;

    @Prop({default:false})
    isDeleted: boolean;

    @Prop({default: Date.now})
    createdAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);