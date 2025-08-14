import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { DataBaseService } from "src/shared/database/database.service";
import { Message, MessageDocument } from "../models/message.schema";
import { Connection, Model } from "mongoose";
import { CreateMessageDTO } from "../dtos/create-message.dtos";

@Injectable()
export class MessageService extends DataBaseService<MessageDocument> {

    constructor(
        @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
        @InjectConnection() connection: Connection
    ){
        super(messageModel, connection)
    }

    async createMessage(createMessageDto: CreateMessageDTO): Promise<MessageDocument> {
        return this.executeWithTransaction( async (session) => {
            // If this is a reply, validate that the parent message exists
            if (createMessageDto.replyTo) {
                const parentMessage = await this.findOneByField({ _id: createMessageDto.replyTo });
                if (!parentMessage) {
                    throw new Error('Parent message not found');
                }
                createMessageDto.isReply = true;
            }

            const newMessage = this.createInstance(createMessageDto);
            await newMessage.save({session});

            // Populate the reply information if it's a reply
            if (newMessage.replyTo) {
                await newMessage.populate('replyTo');

                // Add replyToMessage field for frontend compatibility
                const replyToData = newMessage.replyTo as any;
                (newMessage as any).replyToMessage = {
                    _id: replyToData._id,
                    content: replyToData.content,
                    sender: replyToData.sender,
                    senderName: replyToData.senderName, // Will be undefined, frontend will resolve
                    createdAt: replyToData.createdAt
                };

                console.log(`✅ Added replyToMessage field to new message ${newMessage._id}`);
            }

            return newMessage;
        }).catch(error => {
            console.log(error)
            throw error;
        })
    }

    async getMessagesByTicketId(ticketID): Promise<Message[]>{
        // Get all messages and populate reply information
        const messages = await this.messageModel
            .find({ticket: ticketID.toString()})
            .populate('replyTo')
            .sort({ createdAt: 1 })
            .exec();

        return messages;
    }

    async getMessagesByTicketIdWithReplies(ticketID): Promise<any[]> {
        const messages = await this.getMessagesByTicketId(ticketID);

        console.log(' Raw messages from DB:', messages.length);
        messages.forEach(msg => {
            console.log(` Message ${msg._id}: isDescription=${msg.isDescription}, replyTo=${msg.replyTo}, content="${msg.content.substring(0, 50)}..."`);
        });

        // Organize messages into threads
        const messageMap = new Map();
        const rootMessages = [];

        // First pass: create map and identify root messages
        messages.forEach(message => {
            const messageObj = {
                ...message.toObject(),
                replies: []
            };

            messageMap.set(message._id.toString(), messageObj);

            // Root messages are those without replyTo (including description messages)
            if (!message.replyTo) {
                rootMessages.push(message._id.toString());
            }
        });

        console.log('📨 Root messages found:', rootMessages.length);

        // Second pass: organize replies under their parent messages and set up replyToMessage references
        messages.forEach(message => {
            if (message.replyTo) {
                const parentId = message.replyTo._id?.toString() || message.replyTo.toString();
                const parent = messageMap.get(parentId);
                const child = messageMap.get(message._id.toString());

                if (parent && child) {
                    // Add replyToMessage reference for frontend display
                    child.replyToMessage = {
                        _id: parent._id,
                        content: parent.content,
                        sender: parent.sender,
                        senderName: parent.senderName,
                        createdAt: parent.createdAt
                    };
                    child.isReply = true;

                    parent.replies.push(child);
                    console.log(`📨 Added reply ${message._id} to parent ${parentId} with replyToMessage reference`);
                } else {
                    console.log(`📨 Warning: Could not find parent ${parentId} for reply ${message._id}`);
                }
            }
        });

        // Return only root messages with their replies nested
        const result = rootMessages.map(id => messageMap.get(id)).filter(Boolean);

        console.log('📨 Final threaded result:', result.length, 'root messages');
        result.forEach((msg, index) => {
            console.log(`📨 Root ${index}: ${msg._id}, isDescription=${msg.isDescription}, replies=${msg.replies.length}`);
        });

        return result;
    }

    async getMessageById(messageId: string): Promise<MessageDocument> {
        return await this.messageModel
            .findById(messageId)
            .populate('replyTo')
            .exec();
    }

    async getRepliesForMessage(messageId: string): Promise<Message[]> {
        return await this.messageModel
            .find({ replyTo: messageId })
            .populate('replyTo')
            .sort({ createdAt: 1 })
            .exec();
    }

    /**
     * Delete a message by ID
     * @param messageId ID of the message to delete
     * @returns Deleted message document
     */
    async deleteMessage(messageId: string): Promise<MessageDocument> {
        const message = await this.messageModel.findById(messageId);
        if (!message) {
            throw new Error(`Message with ID ${messageId} not found`);
        }

        // Delete the message
        await this.messageModel.findByIdAndDelete(messageId);
        return message;
    }

    /**
     * Delete a message and emit socket event
     * @param messageId ID of the message to delete
     * @param ticketId ID of the ticket (for socket emission)
     * @returns Deleted message document
     */
    async deleteMessageWithSocketEmission(messageId: string, ticketId: string): Promise<MessageDocument> {
        const deletedMessage = await this.deleteMessage(messageId);

        // Note: We'll emit the socket event from the ChatGateway later
        // For now, we'll just log that we would emit it
        console.log('📡 Would emit messageDeleted event for:', { messageId, ticketId });

        return deletedMessage;
    }
}