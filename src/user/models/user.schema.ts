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

    @Prop({default: 'offline', enum: ['online', 'offline', 'busy', 'away']})
    status: 'online' | 'offline' | 'busy' | 'away';

    @Prop({default: Date.now})
    lastActive: Date;

    @Prop({default: true})
    isAvailableForTickets: boolean;

    @Prop({default: 0})
    activeTicketsCount: number;
}

export const UserSchema = SchemaFactory.createForClass(User);