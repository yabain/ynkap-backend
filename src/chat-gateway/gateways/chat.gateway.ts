import { UsePipes, ValidationPipe } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import mongoose from "mongoose";
import { Server, Socket } from "socket.io";
import { CreateMessageDTO } from "src/message/dtos/create-message.dtos";
import { MessageService } from "src/message/services/message.service";
import { ObjectIDValidationPipe } from "src/shared/pipes/objectID.pipe";
import { TicketService } from "src/ticket/services/ticket.services";
import { NotificationService } from "src/notifications/services/notification.service";
import { AiService } from "src/ai/ai.service";
import { AgentHandoffService } from "src/ai/agent-handoff.service";

@WebSocketGateway({
    cors: {
        origin: "*"
    }
})

export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect{
    public onlineAgents = new Set<string>();
    
    constructor(
        private ticketService: TicketService,
        private messageService: MessageService,
        private notificationService: NotificationService,
        private aiService: AiService,
        private agentHandoffService: AgentHandoffService
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

    @SubscribeMessage('test')
    async handleTest(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
        console.log(`🧪 TEST EVENT received from client ${client.id}:`, data);
        client.emit('testResponse', { message: 'Test successful', clientId: client.id });
        return { success: true };
    }

    @SubscribeMessage('joinConversation')
    async handleJoinConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { ticket: string, userId?: string, userRoles?: string[] }) {
            try {
                const ticketID = new mongoose.Types.ObjectId(data.ticket);
                console.log(`🔌 CLIENT JOINING CONVERSATION: ticket ${ticketID}, client ${client.id}`);

                await this.ticketService.isTicketExist(ticketID.toString());

                client.join(ticketID.toString());
                console.log(`🔌 ✅ CLIENT ${client.id} JOINED ROOM: ${ticketID}`);

                // Auto-register agents when they join conversations
                if (data.userId && data.userRoles) {
                    const isAgent = data.userRoles.some(role => role.includes('solver'));
                    if (isAgent && !this.onlineAgents.has(data.userId)) {
                        console.log(`👋 Auto-registering agent ${data.userId} as online`);
                        this.onlineAgents.add(data.userId);
                        console.log(`✅ Online agents: ${Array.from(this.onlineAgents).join(', ')}`);
                        
                        // Trigger handoff for this agent's tickets
                        const tickets = await this.ticketService.findByField({ 
                            assignTo: data.userId, 
                            status: { $in: ['OPENED', 'IN_PROGRESS'] }
                        });
                        
                        for (const ticket of tickets) {
                            await this.sendAgentOnlineHandoff(ticket._id.toString(), data.userId);
                        }
                    }
                }

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

    @SubscribeMessage('agent_online')
    async handleAgentOnline(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { agentId: string }) {
            try {
                console.log(`👋 AGENT ONLINE: ${data.agentId}`);
                
                // Add agent to online set
                this.onlineAgents.add(data.agentId);
                console.log(`✅ Online agents: ${Array.from(this.onlineAgents).join(', ')}`);
                
                // Find all tickets assigned to this agent that might need handoff
                const tickets = await this.ticketService.findByField({ 
                    assignTo: data.agentId, 
                    status: { $in: ['OPENED', 'IN_PROGRESS'] }
                });
                
                for (const ticket of tickets) {
                    await this.sendAgentOnlineHandoff(ticket._id.toString(), data.agentId);
                }
                
                console.log(`✅ Agent online processing complete for ${data.agentId}`);
            } catch (error) {
                console.error('❌ Error in agentOnline:', error);
            }
    }

    @SubscribeMessage('agent_offline')
    async handleAgentOffline(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { agentId: string }) {
            console.log(`👋 AGENT OFFLINE: ${data.agentId}`);
            this.onlineAgents.delete(data.agentId);
            console.log(`✅ Online agents: ${Array.from(this.onlineAgents).join(', ')}`);
    }

    isAgentOnline(agentId: string): boolean {
        return this.onlineAgents.has(agentId);
    }

    isAnyAgentOnline(): boolean {
        return this.onlineAgents.size > 0;
    }

    private async sendAgentOnlineHandoff(ticketId: string, agentId: string): Promise<void> {
        try {
            const ticket = await this.ticketService.findOneByField({ _id: ticketId });
            if (!ticket) return;
            
            // Check if ticket has AI messages and agent is now available
            const hasAiMessages = ticket.messages?.some(msg => msg.sender === 'ai_bot');
            const isAgentAvailable = this.onlineAgents.has(agentId);
            console.log(`🔍 Agent ${agentId} available for handoff: ${isAgentAvailable}`);
            
            if (hasAiMessages && isAgentAvailable) {
                console.log(`👋 Sending agent online handoff for ticket ${ticketId}`);
                
                // Get agent info
                const agentInfo = await this.ticketService.getUserInfo(agentId);
                const agentName = agentInfo ? this.ticketService.getDisplayName(agentInfo) : 'Support Agent';
                
                // Generate handoff message
                const handoffMessage = await this.aiService.generateHandoffMessage(ticketId, agentName);
                
                // Create handoff message
                const handoffMessageDto = {
                    content: handoffMessage,
                    sender: 'ai_bot',
                    ticket: ticketId,
                    isReply: false,
                    mentionedUsers: [],
                    tags: [],
                    isSystem: true,
                    attachments: []
                };
                
                const message = await this.messageService.createMessage(handoffMessageDto);
                
                // Set conversation handler to agent
                this.aiService.setConversationHandler(ticketId, 'agent');
                
                // Broadcast handoff message
                this.server.to(ticketId).emit('newMessage', message);
                this.server.to(ticketId).emit('agentHandoff', {
                    ticketId,
                    agentId,
                    agentName,
                    message: 'Agent has come online and taken over the conversation'
                });
                
                console.log(`✅ Agent online handoff sent for ticket ${ticketId}`);
            }
        } catch (error) {
            console.error(`❌ Error sending agent online handoff for ticket ${ticketId}:`, error);
        }
    }

    @SubscribeMessage('sendMessage')
    @UsePipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors) => {
            console.log(`📨 ❌ VALIDATION ERRORS:`, errors);
            return new Error(`Validation failed: ${errors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ')}`);
        }
    }))
    async handleNewMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() createMessageDtos : CreateMessageDTO,
        ){
            try {
                console.log(`📨 ✅ RECEIVED sendMessage event from client ${client.id}`);
                console.log(`📨 Processing new message for ticket ${createMessageDtos.ticket} from sender ${createMessageDtos.sender}`);

                const ticket = await this.ticketService.findOneByField({ _id: createMessageDtos.ticket });
                if (!ticket) {
                    throw new Error('Ticket not found');
                }

                console.log(`🎫 Current ticket status: ${ticket.status}, assignTo: ${ticket.assignTo}, user: ${ticket.user}`);

                const message = await this.messageService.createMessage(createMessageDtos);
                console.log(`✅ Message created: ${message._id}`);

                const roomName = createMessageDtos.ticket.toString();
                console.log(`📡 BROADCASTING user message ${message._id} to room ${roomName}`);
                this.server.to(roomName).emit('newMessage', message);
                console.log(`📡 ✅ BROADCASTED user message to room ${roomName}`);

                const isUserTicketOwner = ticket.user === createMessageDtos.sender;
                console.log(`🤖 AI CHECK: isUserTicketOwner=${isUserTicketOwner}, ticket.user=${ticket.user}, sender=${createMessageDtos.sender}`);
                
                if (isUserTicketOwner) {
                    console.log('🤖 Message from ticket owner, checking AI fallback...');
                    // Check if agent is online via socket first, then fallback to database
                    const isAgentOnlineViaSocket = this.onlineAgents.has(ticket.assignTo);
                    console.log(`🔍 Agent ${ticket.assignTo} online via socket: ${isAgentOnlineViaSocket}`);
                    
                    let shouldProvideAiFallback = true;
                    if (isAgentOnlineViaSocket) {
                        shouldProvideAiFallback = false;
                        console.log(`🤖 Agent online via socket - no AI fallback`);
                    } else {
                        shouldProvideAiFallback = await this.aiService.shouldProvideAiFallback(
                            createMessageDtos.ticket.toString(),
                            ticket.assignTo,
                            ticket.type,
                            ticket
                        );
                    }
                    
                    console.log('🤖 Should provide AI fallback:', shouldProvideAiFallback);
                    
                    if (shouldProvideAiFallback) {
                        console.log('🤖 Generating AI response...');
                        
                        this.server.to(roomName).emit('aiTyping', { 
                            ticketId: createMessageDtos.ticket.toString(),
                            isTyping: true 
                        });
                        
                        this.generateAndSendAiResponse(roomName, createMessageDtos, ticket);
                    } else {
                        console.log('🤖 AI fallback not needed (agent available)');
                    }
                } else {
                    console.log('🤖 Message NOT from ticket owner, skipping AI fallback');
                    
                    // If message is from assigned agent, update last agent activity
                    const isAssignedAgent = ticket.assignTo === createMessageDtos.sender;
                    if (isAssignedAgent) {
                        console.log('👨‍💼 Agent message detected, updating activity timestamp');
                        ticket.lastAgentActivity = new Date();
                        await ticket.save();
                        
                        // Set conversation handler to agent
                        this.aiService.setConversationHandler(createMessageDtos.ticket.toString(), 'agent');
                    }
                }

                await this.handleAutoStatusChange(ticket, createMessageDtos.sender);

                if (createMessageDtos.replyTo) {
                    this.server.to(roomName).emit('newReply', {
                        replyTo: createMessageDtos.replyTo,
                        message: message
                    });
                    console.log(`📡 ✅ BROADCASTED newReply to room ${roomName}`);
                }

                this.sendMessageNotifications(message, createMessageDtos).catch(error => {
                    console.error('Failed to send message notifications:', error);
                });

            } catch (error) {
                console.error(`📨 ❌ ERROR processing message:`, error);
                client.emit('messageError', {
                    message: 'Failed to send message: ' + error.message,
                    error: error.message
                });
                console.error(`📨 ❌ Message sending failed for client ${client.id}`);
            }
    }

    private async generateAndSendAiResponse(roomName: string, createMessageDtos: CreateMessageDTO, ticket: any): Promise<void> {
        try {
            const aiResponse = await this.aiService.generateResponse({
                message: createMessageDtos.content,
                ticketType: ticket.type,
                ticketId: createMessageDtos.ticket.toString()
            });
            
            this.server.to(roomName).emit('aiTyping', { 
                ticketId: createMessageDtos.ticket.toString(),
                isTyping: false 
            });
            
            const aiMessageDto: CreateMessageDTO = {
                content: aiResponse,
                sender: 'ai_bot',
                ticket: createMessageDtos.ticket,
                isReply: false,
                mentionedUsers: [],
                tags: [],
                isSystem: false,
                attachments: []
            };
            
            const aiMessage = await this.messageService.createMessage(aiMessageDto);
            this.server.to(roomName).emit('newMessage', aiMessage);
            
            this.agentHandoffService.trackAiResponse(createMessageDtos.ticket.toString());
            
            console.log('🤖 ✅ AI response sent');
        } catch (aiError) {
            this.server.to(roomName).emit('aiTyping', { 
                ticketId: createMessageDtos.ticket.toString(),
                isTyping: false 
            });
            console.error('🤖 ❌ Error generating AI response:', aiError);
        }
    }

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

    emitMessageDeleted(ticketId: string, messageId: string): void {
        console.log('📡 Emitting messageDeleted event for ticket:', ticketId, 'message:', messageId);
        this.server.to(ticketId).emit('messageDeleted', {
            messageId: messageId,
            ticketId: ticketId
        });
    }

    private async handleAutoStatusChange(ticket: any, senderId: string): Promise<void> {
        try {
            if (ticket.status !== 'OPEN') {
                console.log(`Ticket ${ticket._id} status is ${ticket.status}, no auto-change needed`);
                return;
            }

            const isAssignedAgent = ticket.assignTo === senderId;
            const isTicketOwner = ticket.user === senderId;

            console.log(`🎫 AUTO STATUS DEBUG: assignTo=${ticket.assignTo}, user=${ticket.user}, sender=${senderId}`);
            console.log(`🎫 AUTO STATUS DEBUG: isAssignedAgent=${isAssignedAgent}, isTicketOwner=${isTicketOwner}`);

            if (isAssignedAgent && !isTicketOwner) {
                console.log(`Agent ${senderId} sent first message to ticket ${ticket._id}, auto-changing status to IN_PROGRESS`);

                ticket.status = 'IN_PROGRESS';
                await ticket.save();
                
                // Set conversation handler to agent
                this.aiService.setConversationHandler(ticket._id.toString(), 'agent');

                try {
                    console.log(`Creating status history for ticket ${ticket._id}`);
                } catch (historyError) {
                    console.error('Error creating status history:', historyError);
                }

                try {
                    const agentInfo = await this.ticketService.getUserInfo(senderId);
                    const agentName = agentInfo ? this.ticketService.getDisplayName(agentInfo) : 'Support Agent';
                    const handoffMessage = await this.aiService.generateHandoffMessage(ticket._id.toString(), agentName);
                    
                    const aiHandoffDto = {
                        content: handoffMessage,
                        sender: 'ai_bot',
                        ticket: ticket._id,
                        isReply: false,
                        mentionedUsers: [],
                        tags: [],
                        isSystem: true,
                        attachments: []
                    };
                    
                    const aiHandoffMessageObj = await this.messageService.createMessage(aiHandoffDto);
                    this.server.to(ticket._id.toString()).emit('newMessage', aiHandoffMessageObj);
                    this.server.to(ticket._id.toString()).emit('agentHandoff', {
                        ticketId: ticket._id.toString(),
                        agentId: senderId,
                        agentName,
                        message: 'Agent has taken over the conversation'
                    });
                    console.log('🤖 ✅ AI handoff message sent');
                } catch (handoffError) {
                    console.error('🤖 ❌ Error sending handoff message:', handoffError);
                }

                this.server.to(ticket._id.toString()).emit('ticketStatusChanged', {
                    ticketId: ticket._id,
                    oldStatus: 'OPEN',
                    newStatus: 'IN_PROGRESS',
                    changedBy: senderId,
                    automatic: true
                });

                console.log(`Ticket ${ticket._id} status automatically changed to IN_PROGRESS`);
            } else {
                console.log(`Message from ${isTicketOwner ? 'ticket owner' : 'other user'}, no auto-change needed`);
            }
        } catch (error) {
            console.error('Error in handleAutoStatusChange:', error);
        }
    }

    private async sendMessageNotifications(message: any, createMessageDto: CreateMessageDTO): Promise<void> {
        try {
            const ticket = await this.ticketService.findOneByField({ _id: createMessageDto.ticket });
            if (!ticket) {
                console.error('Ticket not found for message notification');
                return;
            }

            const senderInfo = await this.ticketService.getUserInfo(createMessageDto.sender);
            if (!senderInfo) {
                console.error('Sender information not found for message notification');
                return;
            }

            const senderName = this.ticketService.getDisplayName(senderInfo);

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

            console.log('Message notifications sent successfully');
        } catch (error) {
            console.error('Error sending message notifications:', error);
        }
    }

}