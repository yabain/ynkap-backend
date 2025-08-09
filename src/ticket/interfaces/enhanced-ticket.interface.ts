import { Ticket } from '../models/ticket.schema';

export interface UserInfo {
    _id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    roles?: string[];
}

export interface EnhancedMessage {
    sender: string;
    content: string;
    createdAt: Date;
    attachments?: string[];
    relatedFaqs?: string[];
    senderName: string;
    senderEmail: string;
}

export interface EnhancedTicket extends Omit<Ticket, 'messages'> {
    createdBy?: UserInfo;
    messages: EnhancedMessage[];
    isOwnedByUser: boolean;
    isAssignedToUser: boolean;
}
