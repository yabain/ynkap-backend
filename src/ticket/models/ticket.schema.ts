import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Document } from "mongoose";
import { TicketStatus } from "../enums/ticket-status.enum";
import { TicketTypes } from "../enums/ticket-types.enum";

export type TicketDocument = HydratedDocument<Ticket>

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
export class Ticket extends Document {

    @Prop({required: true})
    title: string;
    
    @Prop({required: true, unique: true, default: () => `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`})
    refNumber: string;
    
    @Prop({required: true})
    description: string;

    @Prop({required: true})
    type: TicketTypes;

    @Prop({default: TicketStatus.OPEN})
    status: TicketStatus;

    @Prop({required: true})
    user: string;

    @Prop({default: false})
    isDeleted: boolean;

    @Prop({default: () => Date.now(), required: true})
    createdAt: Date;

    @Prop({required: true})
    assignTo: string;

    @Prop({default: []})
    messages: {
        sender: string;
        content: string;
        createdAt: Date;
        attachments?: string[];
        relatedFaqs?: string[];
    }[];

    @Prop({default: []})
    attachments: string[];

    @Prop({default: []})
    relatedFaqs: string[];

    @Prop({default: null})
    resolutionDate: Date;

    @Prop({default: null})
    resolutionNotes: string;

    @Prop({default: null})
    rejectionReason: string;

    @Prop({default: 0})
    priority: number;

    @Prop({default: []})
    tags: string[];

    @Prop({default: false})
    isUrgent: boolean;

    @Prop({default: false})
    isEscalated: boolean;

    @Prop({default: []})
    notificationHistory: {
        type: string;
        recipients: string[];
        createdAt: Date;
        status: string;
    }[];

}

export const TicketSchema = SchemaFactory.createForClass(Ticket);

// Add unique index on refNumber
TicketSchema.index({ refNumber: 1 }, { unique: true });