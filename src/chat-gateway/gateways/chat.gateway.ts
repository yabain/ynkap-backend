import { UsePipes, ValidationPipe } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import mongoose from "mongoose";
import { Server, Socket } from "socket.io";
import { CreateMessageDTO } from "src/message/dtos/create-message.dtos";
import { MessageService } from "src/message/services/message.service";
import { ObjectIDValidationPipe } from "src/shared/pipes/objectID.pipe";
import { TicketService } from "src/ticket/services/ticket.services";
import { NotificationService } from "src/notifications/services/notification.service";

@WebSocketGateway({
    cors: {
        origin: "*"
    }
})

export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect{
    constructor(
        private ticketService: TicketService,
        private messageService: MessageService,
        private notificationService: NotificationService
    ){}

    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket, ...args: any[]){
        console.log(`The client socket ${client.id} is connected to the canal`);
        client.emit('connected', {message : `${client.id} is connected to chat`})
    }

    handleDisconnect(client: any){
        console.log(`The client ${client.id} has logged out`)
    }

    // Initialisation d'une nouvelle consersation
    @SubscribeMessage('joinConversation')
    async handleJoinConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody("ticket", ObjectIDValidationPipe) ticketID: mongoose.Types.ObjectId) {
            try {
                console.log(`🔌 CLIENT JOINING CONVERSATION: ticket ${ticketID}, client ${client.id}`);

                await this.ticketService.isTicketExist(ticketID.toString());

                //Création d'une room pour les utilisateurs concernés par le ticket
                client.join(ticketID.toString());
                console.log(`🔌 ✅ CLIENT ${client.id} JOINED ROOM: ${ticketID}`);

                // Get messages with threaded replies
                const messages = await this.messageService.getMessagesByTicketIdWithReplies(ticketID);
                console.log(`📨 Sending ${messages.length} initial messages to client ${client.id}`);
                client.emit('messages', messages);

                console.log(`🔌 ✅ ROOM JOIN COMPLETE for ticket ${ticketID}`);
            } catch (error) {
                console.error('❌ Error in joinConversation:', error);
                client.emit('error', { message: 'Une erreur s\'est produite lorsque le client à tenter de joindre la conversation'})
                throw error;
            }

    }

    //Envoi d'un message
    @SubscribeMessage('sendMessage')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    async handleNewMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() createMessageDtos : CreateMessageDTO,
        ){
            try {
                console.log(`📨 Handling new message for ticket ${createMessageDtos.ticket} from sender ${createMessageDtos.sender}`);

                // Get ticket info to check current status and sender role
                const ticket = await this.ticketService.findOneByField({ _id: createMessageDtos.ticket });
                if (!ticket) {
                    throw new Error('Ticket not found');
                }

                console.log(`🎫 Current ticket status: ${ticket.status}, assignTo: ${ticket.assignTo}, user: ${ticket.user}`);

                // Create the message first
                const message = await this.messageService.createMessage(createMessageDtos);
                console.log(`✅ Message created: ${message._id}`);

                // Check if we need to auto-change status to IN_PROGRESS
                await this.handleAutoStatusChange(ticket, createMessageDtos.sender);

                // Emit the new message to all clients in the ticket room
                const roomName = createMessageDtos.ticket.toString();
                console.log(`📡 BROADCASTING message ${message._id} to room ${roomName}`);
                console.log(`📡 Message content: ${message.content?.substring(0, 50)}...`);
                console.log(`📡 Room clients count:`, this.server.sockets.adapter.rooms.get(roomName)?.size || 0);

                this.server.to(roomName).emit('newMessage', message);
                console.log(`📡 ✅ BROADCASTED newMessage to room ${roomName}`);

                // If this is a reply, also emit a specific reply event
                if (createMessageDtos.replyTo) {
                    this.server.to(roomName).emit('newReply', {
                        replyTo: createMessageDtos.replyTo,
                        message: message
                    });
                    console.log(`📡 ✅ BROADCASTED newReply to room ${roomName}`);
                }

                // Send message notifications (non-blocking)
                this.sendMessageNotifications(message, createMessageDtos).catch(error => {
                    console.error('Failed to send message notifications:', error);
                    // Don't fail message sending if notifications fail
                });

            } catch (error) {
                console.error({ error: error.message});
                client.emit('error', { message: 'Une erreur s\'est produite lors de l\'envoi de nouveaux messages'});
                throw error;
            }
    }

    // Get replies for a specific message
    @SubscribeMessage('getReplies')
    async handleGetReplies(
        @ConnectedSocket() client: Socket,
        @MessageBody("messageId", ObjectIDValidationPipe) messageId: mongoose.Types.ObjectId
    ) {
        try {
            const replies = await this.messageService.getRepliesForMessage(messageId.toString());
            client.emit('repliesForMessage', {
                messageId: messageId.toString(),
                replies: replies
            });
        } catch (error) {
            console.error({ error: error.message});
            client.emit('error', { message: 'Une erreur s\'est produite lors de la récupération des réponses'});
            throw error;
        }
    }

    /**
     * Emit message deleted event to all clients in the ticket room
     * @param ticketId ID of the ticket
     * @param messageId ID of the deleted message
     */
    emitMessageDeleted(ticketId: string, messageId: string): void {
        console.log('📡 Emitting messageDeleted event for ticket:', ticketId, 'message:', messageId);
        this.server.to(ticketId).emit('messageDeleted', {
            messageId: messageId,
            ticketId: ticketId
        });
    }

    /**
     * Handle automatic status change to IN_PROGRESS when agent sends first message
     * @param ticket The ticket object
     * @param senderId The ID of the message sender
     */
    private async handleAutoStatusChange(ticket: any, senderId: string): Promise<void> {
        try {
            // Only auto-change if ticket is currently OPEN
            if (ticket.status !== 'OPEN') {
                console.log(`Ticket ${ticket._id} status is ${ticket.status}, no auto-change needed`);
                return;
            }

            // Check if sender is the assigned agent (not the ticket owner)
            const isAssignedAgent = ticket.assignTo === senderId;
            const isTicketOwner = ticket.user === senderId;

            console.log(`🎫 AUTO STATUS DEBUG: assignTo=${ticket.assignTo}, user=${ticket.user}, sender=${senderId}`);
            console.log(`🎫 AUTO STATUS DEBUG: isAssignedAgent=${isAssignedAgent}, isTicketOwner=${isTicketOwner}`);

            if (isAssignedAgent && !isTicketOwner) {
                console.log(`Agent ${senderId} sent first message to ticket ${ticket._id}, auto-changing status to IN_PROGRESS`);

                // Update ticket status to IN_PROGRESS
                ticket.status = 'IN_PROGRESS';
                await ticket.save();

                // Create history entry for the status change (if method exists)
                try {
                    // Note: We'll need to add this method to TicketService if it doesn't exist
                    console.log(`Creating status history for ticket ${ticket._id}`);
                } catch (historyError) {
                    console.error('Error creating status history:', historyError);
                }

                // Emit status change event to all clients in the ticket room
                this.server.to(ticket._id.toString()).emit('ticketStatusChanged', {
                    ticketId: ticket._id,
                    oldStatus: 'OPEN',
                    newStatus: 'IN_PROGRESS',
                    changedBy: senderId,
                    automatic: true
                });

                console.log(` Ticket ${ticket._id} status automatically changed to IN_PROGRESS`);
            } else {
                console.log(` Message from ${isTicketOwner ? 'ticket owner' : 'other user'}, no auto-change needed`);
            }
        } catch (error) {
            console.error('Error in handleAutoStatusChange:', error);
            // Don't throw error to avoid breaking message sending
        }
    }

    /**
     * Send message notifications to relevant users
     * @param message The created message
     * @param createMessageDto The message creation data
     */
    private async sendMessageNotifications(message: any, createMessageDto: CreateMessageDTO): Promise<void> {
        try {
            // Get ticket information
            const ticket = await this.ticketService.findOneByField({ _id: createMessageDto.ticket });
            if (!ticket) {
                console.error('Ticket not found for message notification');
                return;
            }

            // Get sender information (from message sender field)
            const senderInfo = await this.ticketService.getUserInfo(createMessageDto.sender);
            if (!senderInfo) {
                console.error('Sender information not found for message notification');
                return;
            }

            const senderName = this.ticketService.getDisplayName(senderInfo);

            // Notify ticket owner (if not the sender)
            if (ticket.user !== createMessageDto.sender) {
                const ownerInfo = await this.ticketService.getUserInfo(ticket.user);
                if (ownerInfo) {
                    await this.notificationService.sendTicketMessageNotification(
                        ticket,
                        ticket.user,
                        ownerInfo.email,
                        this.ticketService.getDisplayName(ownerInfo),
                        senderName,
                        createMessageDto.content
                    );
                }
            }

            // Notify assigned agent (if exists and not the sender)
            if (ticket.assignTo && ticket.assignTo !== createMessageDto.sender) {
                const agentInfo = await this.ticketService.getUserInfo(ticket.assignTo);
                if (agentInfo) {
                    await this.notificationService.sendTicketMessageNotification(
                        ticket,
                        ticket.assignTo,
                        agentInfo.email,
                        this.ticketService.getDisplayName(agentInfo),
                        senderName,
                        createMessageDto.content
                    );
                }
            }

            console.log(' Message notifications sent successfully');
        } catch (error) {
            console.error('Error sending message notifications:', error);
        }
    }

}