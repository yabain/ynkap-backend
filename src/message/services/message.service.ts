import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { DataBaseService } from "src/shared/database/database.service";
import { Message, MessageDocument } from "../models/message.schema";
import { Connection, Model } from "mongoose";

@Injectable()
export class MessageService extends DataBaseService<MessageDocument> {
    
    constructor(
        @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
        @InjectConnection() connection: Connection
    ){
        super(messageModel, connection)
    }

    async createMessage(createMessageDtos): Promise<MessageDocument> {
        return this.executeWithTransaction( async (session) => {
            const newMessage = this.createInstance(createMessageDtos)
            await newMessage.save({session});
            return newMessage;
        }).catch(error => {
            console.log(error)
            throw error;
        })
    }
    async getMessagesByTicketId(ticketID): Promise<Message[]>{
        return await this.findByField({ticket: ticketID.toString()})
    }
}