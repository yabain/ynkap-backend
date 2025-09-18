import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument,Document } from "mongoose";
import { Ticket } from "src/ticket/models/ticket.schema";

export type MessageDocument = HydratedDocument<Message>

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
export class Message extends Document {

    @Prop({required: true})
    content: string;

    @Prop({required: true})
    sender: string;

    @Prop({type: mongoose.Types.ObjectId, ref: Ticket.name, required: true})
    ticket: Ticket;

    @Prop({default: () => Date.now()})
    createdAt: Date;

    // Reply functionality
    @Prop({type: mongoose.Types.ObjectId, ref: Message.name, default: null})
    replyTo: Message;

    @Prop({default: false})
    isReply: boolean;

    // Message tagging/mentioning
    @Prop({type: [String], default: []})
    mentionedUsers: string[];

    @Prop({type: [String], default: []})
    tags: string[];

    // Message metadata
    @Prop({default: false})
    isSystem: boolean;

    @Prop({default: false})
    isDescription: boolean;

    @Prop({type: [String], default: []})
    attachments: string[];

    // Enhanced attachment support
    @Prop({
        type: [{
            attachmentId: { type: String, required: true },
            fileName: { type: String, required: true },
            fileType: { type: String, required: true },
            fileSize: { type: Number, required: true },
            url: { type: String, required: true },
            thumbnailUrl: { type: String, default: null }
        }],
        default: []
    })
    attachmentDetails: {
        attachmentId: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        url: string;
        thumbnailUrl?: string;
    }[];
}

export const MessageSchema = SchemaFactory.createForClass(Message)