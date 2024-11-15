import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Document } from "mongoose";
import { StatusNotification } from "../enums/status-notification.enum";

export type NotificationDocument = HydratedDocument<Notification>;

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
export class Notification extends Document {

    @Prop({default: StatusNotification.UNREAD})
    status: StatusNotification;

    @Prop({default: "all", required: true})
    receiver: string;

    @Prop({default:() => Date.now()})
    createdAt: Date;

}

export const NotificationSchema = SchemaFactory.createForClass(Notification)