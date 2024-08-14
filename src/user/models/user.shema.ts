import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document, HydratedDocument } from "mongoose"


export type UserDocument = HydratedDocument<User> // Un HydratedDocument est "hydraté", i.e qu'il a été enrichi avec les méthodes et fonctionnalités de Mongoose


@Schema()
export class User extends Document
{

    @Prop({unique: true})
    sub: string;

    @Prop({default:false})
    isDeleted: boolean;

    @Prop({})
    createdAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User)