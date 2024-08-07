import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document, HydratedDocument } from "mongoose"


export type UserDocument = HydratedDocument<User> // Un HydratedDocument est "hydraté", i.e qui a été enrichi avec les méthodes et fonctionnalités de Mongoose


@Schema()
export class User 
{

    @Prop({unique: true})
    sub: string;

    @Prop({default:false})
    isDeleted: boolean;

    @Prop({})
    createdAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User)