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
    
    @Prop({required: true})
    description: string;

    @Prop({required:true})
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

}

export const TicketSchema = SchemaFactory.createForClass(Ticket);