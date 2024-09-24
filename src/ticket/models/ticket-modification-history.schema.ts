import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument, Document } from "mongoose";
import { Ticket } from "./ticket.schema";

export type TicketHistoryDocument = HydratedDocument<TicketStatusHistory>

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
export class TicketStatusHistory extends Document {

    @Prop({type: mongoose.Types.ObjectId, ref: Ticket.name})
    ticket: Ticket;

    @Prop()
    statusBefore: string;

    @Prop()
    statusAfter: string;

    @Prop({default: Date.now()})
    updateAt: Date;

    @Prop()
    updateBy: string;
}

export const TicketStatusHistorySchema = SchemaFactory.createForClass(TicketStatusHistory);