import { Injectable } from "@nestjs/common";
import { DataBaseService } from "src/shared/database/database.service";
import { TicketStatusHistory, TicketHistoryDocument } from "../models/ticket-modification-history.schema";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model } from "mongoose";

@Injectable()
export class TicketHistoryService extends DataBaseService<TicketHistoryDocument> {
        constructor(
            @InjectModel(TicketStatusHistory.name) private ticketHistoryModel: Model<TicketHistoryDocument>,
            @InjectConnection() connection: Connection
        ){
            super(ticketHistoryModel, connection)
        }

        async createHistory(ticketId, statusBefore, statusAfter, updateBy) {
            const history = this.createInstance({
                ticketId,
                statusBefore,
                statusAfter,
                updateBy: updateBy
            })
            await history.save()
        }
}