import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DataBaseService } from "src/shared/database/database.service";
import { Ticket, TicketDocument } from "../models/ticket.schema";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model } from "mongoose";
import { KeycloakApiService } from "../../keycloak/keycloak-api.service";
import { TicketTypes } from "../enums/ticket-types.enum";
import { TicketStatus } from "../enums/ticket-status.enum";
import { TicketHistoryService } from "./ticket-history.service";
import { NotificationService } from "../../notifications/services/notification.service";
import { AddMessageDTO } from "../dtos/add-message.dto";
import { UpdateStatusTicketDTO } from "../dtos/update-status-ticket.dto";
import { CreateTicketDTO } from "../dtos/create-ticket.dto";

/**
 * Service for handling ticket-related operations
 */
@Injectable()
export class TicketService extends DataBaseService<TicketDocument> {

    constructor(
        @InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
        @InjectConnection() connection: Connection,
        private keycloakApiService: KeycloakApiService,
        private ticketHistoryService: TicketHistoryService,
        private notificationService: NotificationService
    ) {
        super(ticketModel, connection);
    }

    /**
     * Check if a ticket exists by ID
     * @param id Ticket ID to check
     * @returns true if ticket exists, throws NotFoundException otherwise
     */
    async isTicketExist(id: string): Promise<boolean> {
        const ticket = await this.findOneByField({ _id: id });
        if (!ticket) {
            throw new NotFoundException(`Ticket with ID ${id} not found`);
        }
        return true;
    }

    /**
     * Create a new ticket
     * @param createTicketDto Ticket creation data
     * @param req Request object containing user information
     * @returns Created ticket document
     */
    async createTicket(createTicketDto: CreateTicketDTO, req: any): Promise<TicketDocument> {
        try {
            return await this.executeWithTransaction(async (session) => {
                const roles = req['user']['realm_access']['roles'];
                if (roles.includes('manager')) {
                    throw new BadRequestException('A manager is not allowed to create a ticket');
                }

                // Use Keycloak API to get users by role and select a random agent
                const roleMapping = {
                    'BUG': 'bugs-solver',
                    'TRANSACTION': 'transactions-solver',
                    'OTHERS': 'other-problems-solver'
                };
                
                const requiredRole = roleMapping[createTicketDto.type as keyof typeof roleMapping];
                if (!requiredRole) {
                    throw new BadRequestException(`Invalid ticket type: ${createTicketDto.type}`);
                }
                
                const userSolvers = await this.keycloakApiService.getUsersByRole(requiredRole, req);
                if (!userSolvers || userSolvers.length === 0) {
                    throw new NotFoundException(`No available agents found for ticket type ${createTicketDto.type}`);
                }
                
                // Select a random agent
                const randomIndex = Math.floor(Math.random() * userSolvers.length);
                const solver = userSolvers[randomIndex];

                const initialMessage = {
                    sender: req['user']['sub'],
                    content: createTicketDto.description,
                    createdAt: new Date(),
                    attachments: [],
                    relatedFaqs: []
                };

                const newTicket = this.createInstance({
                    ...createTicketDto,
                    user: req['user']['sub'],
                    assignTo: solver,
                    messages: [initialMessage],
                    attachments: [],
                    relatedFaqs: [],
                    notificationHistory: []
                });

                await newTicket.save({ session });
                console.log('Created ticket with messages:', newTicket.messages);
                console.log('Number of messages in new ticket:', newTicket.messages.length);
                
                await this.ticketHistoryService.createHistory(newTicket._id, null, TicketStatus.OPEN, req['user']['sub']);
                
                // Send comprehensive notifications (database + email)
                try {
                    // Get user information for notifications
                    const creatorInfo = await this.getUserInfo(req['user']['sub']);
                    const agentInfo = await this.getUserInfo(solver);
                    
                    if (creatorInfo && agentInfo) {
                        await this.notificationService.sendTicketCreationNotifications(
                            newTicket,
                            req['user']['sub'], // creator user ID
                            creatorInfo.email,
                            creatorInfo.name,
                            solver, // agent user ID
                            agentInfo.email,
                            agentInfo.name
                        );
                    }
                } catch (notificationError) {
                    console.error('Failed to send notifications:', notificationError);
                    // Don't fail ticket creation if notifications fail
                }
                
                return newTicket;
            });
        } catch (error) {
            console.error('Error in createTicket:', error);
            throw error;
        }
    }

    /**
     * Get tickets for a user based on their role
     * @param req Request object containing user information
     * @returns Array of tickets
     */
    async getTicketsForUser(req: any): Promise<Ticket[]> {
        const roles = req['user']['realm_access']['roles'];
        const userId = req['user']['sub'];

        // Check if user is a solver/agent (has any solver role)
        const isSolver = roles.some(role => 
            role.includes('solver') || 
            role.includes('manager') || 
            role.includes('admin')
        );

        let tickets: Ticket[] = [];

        if (isSolver) {
            // For solvers/agents, show both tickets they created AND tickets assigned to them
            tickets = await this.findByField({
                $or: [
                    { user: userId },        // Tickets they created
                    { assignTo: userId }     // Tickets assigned to them
                ]
            });

            // Add ownership information to distinguish between created and assigned tickets
            tickets = tickets.map(ticket => {
                const ticketObj = ticket.toObject();
                return {
                    ...ticketObj,
                    isOwnedByUser: ticket.user === userId,
                    isAssignedToUser: ticket.assignTo === userId
                };
            });
        } else {
            // For regular users, show only tickets they created
            tickets = await this.findByField({ user: userId });
            
            // Add ownership information
            tickets = tickets.map(ticket => {
                const ticketObj = ticket.toObject();
                return {
                    ...ticketObj,
                    isOwnedByUser: true,
                    isAssignedToUser: false
                };
            });
        }

        console.log('User roles:', roles);
        console.log('Is solver:', isSolver);
        console.log('User ID:', userId);
        console.log('Found tickets:', tickets.length);
        
        return tickets;
    }

    /**
     * Get tickets for a user by status
     * @param req Request object containing user information
     * @param status Ticket status to filter by
     * @returns Array of tickets
     */
    async getTicketsByStatus(req: any, status: string): Promise<Ticket[]> {
        const roles = req['user']['realm_access']['roles'];
        const userId = req['user']['sub'];
        const normalizedStatus = status.toUpperCase() as TicketStatus;

        // Check if user is a solver/agent (has any solver role)
        const isSolver = roles.some(role => 
            role.includes('solver') || 
            role.includes('manager') || 
            role.includes('admin')
        );

        let tickets: Ticket[] = [];

        if (isSolver) {
            // For solvers/agents, show both tickets they created AND tickets assigned to them
            tickets = await this.findByField({
                $or: [
                    { user: userId },        // Tickets they created
                    { assignTo: userId }     // Tickets assigned to them
                ],
                status: normalizedStatus
            });

            // Add ownership information to distinguish between created and assigned tickets
            tickets = tickets.map(ticket => {
                const ticketObj = ticket.toObject();
                return {
                    ...ticketObj,
                    isOwnedByUser: ticket.user === userId,
                    isAssignedToUser: ticket.assignTo === userId
                };
            });
        } else {
            // For regular users, show only tickets they created
            tickets = await this.findByField({
                user: userId,
                status: normalizedStatus
            });
            
            // Add ownership information
            tickets = tickets.map(ticket => {
                const ticketObj = ticket.toObject();
                return {
                    ...ticketObj,
                    isOwnedByUser: true,
                    isAssignedToUser: false
                };
            });
        }

        console.log('User roles:', roles);
        console.log('Is solver:', isSolver);
        console.log('User ID:', userId);
        console.log('Status filter:', normalizedStatus);
        console.log('Found tickets:', tickets.length);

        return tickets;
    }

    /**
     * Update ticket status
     * @param id Ticket ID
     * @param updateStatusDto Status update data
     * @param req Request object containing user information
     */
    async updateTicketStatus(id: string, updateStatusDto: UpdateStatusTicketDTO, req: any): Promise<void> {
        return this.executeWithTransaction(async (session) => {
            const ticket = await this.findOneByField({ _id: id });
            if (!ticket) {
                throw new BadRequestException(`Ticket with ID ${id} not found`);
            }

            const roles = req['user']['realm_access']['roles'];
            if (!roles.includes('manager')) {
                throw new ForbiddenException('Unauthorized user');
            }

            const allowedTransitions = {
                [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSE],
                [TicketStatus.IN_PROGRESS]: [TicketStatus.SOLVE, TicketStatus.CLOSE],
                [TicketStatus.SOLVE]: [TicketStatus.CLOSE]
            };

            const currentStatus = ticket.status;
            const newStatus = updateStatusDto.newStatus as TicketStatus;

            if (!allowedTransitions[currentStatus] || !allowedTransitions[currentStatus].includes(newStatus)) {
                throw new BadRequestException('Unauthorized status change');
            }

            ticket.status = newStatus;
            await ticket.save({ session });
            await this.ticketHistoryService.createHistory(ticket._id, currentStatus, newStatus, req['user']['sub']);
        }).catch((error) => {
            throw error;
        });
    }

    /**
     * Add a message to a ticket
     * @param ticketId Ticket ID
     * @param messageDto Message data
     * @param req Request object containing user information
     * @returns Updated ticket document
     */
    async addMessageToTicket(ticketId: string, messageDto: AddMessageDTO, req: any): Promise<TicketDocument> {
        const ticket = await this.findOneByField({ _id: ticketId });
        if (!ticket) {
            throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
        }

        const isUserTicketOwner = ticket.user === req['user']['sub'];
        const isUserAssignedAgent = ticket.assignTo === req['user']['sub'];
        const isUserAdmin = req['user']['realm_access']['roles'].includes('admin');

        if (!isUserTicketOwner && !isUserAssignedAgent && !isUserAdmin) {
            throw new ForbiddenException('You are not authorized to add messages to this ticket');
        }

        // Validate attachments
        if (messageDto.attachments && messageDto.attachments.length > 0) {
            // Add validation logic for attachments if needed
        }

        const message = {
            sender: req['user']['sub'],
            content: messageDto.content,
            createdAt: new Date(),
            attachments: messageDto.attachments || [],
            relatedFaqs: messageDto.relatedFaqs || []
        };

        ticket.messages.push(message);
        if (messageDto.attachments) {
            ticket.attachments = [...ticket.attachments, ...messageDto.attachments];
        }

        await ticket.save();

        // Send notification to the other party (not the sender)
        const recipientId = isUserTicketOwner ? ticket.assignTo : ticket.user;
        await this.sendNotification(
            recipientId,
            `New message on ticket: ${ticket.title}`,
            `A new message has been added to your ticket: ${ticket.title}`
        );

        return ticket;
    }

    /**
     * Get messages for a ticket
     * @param ticketId ID of the ticket
     * @param req Request object containing user information
     * @returns Array of ticket messages
     */
    async getTicketMessages(ticketId: string, req: any): Promise<any[]> {
        console.log('Getting messages for ticket:', ticketId);
        console.log('User ID:', req['user']['sub']);
        
        const ticket = await this.findOneByField({ _id: ticketId });
        if (!ticket) {
            throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
        }

        console.log('Found ticket:', {
            id: ticket._id,
            title: ticket.title,
            user: ticket.user,
            assignTo: ticket.assignTo,
            messagesCount: ticket.messages?.length || 0
        });

        const isUserTicketOwner = ticket.user === req['user']['sub'];
        const isUserAssignedAgent = ticket.assignTo === req['user']['sub'];
        const isUserAdmin = req['user']['realm_access']['roles'].includes('admin');

        console.log('Authorization check:', {
            isUserTicketOwner,
            isUserAssignedAgent,
            isUserAdmin,
            userRoles: req['user']['realm_access']['roles']
        });

        if (!isUserTicketOwner && !isUserAssignedAgent && !isUserAdmin) {
            throw new ForbiddenException('You are not authorized to view messages for this ticket');
        }

        console.log('Ticket messages:', ticket.messages);
        console.log('Number of messages:', ticket.messages?.length || 0);
        
        if (ticket.messages && ticket.messages.length > 0) {
            console.log('First message:', ticket.messages[0]);
        }
        
        return ticket.messages || [];
    }

    /**
     * Get user information from Keycloak using the admin API
     * @param userId User ID to get information for
     * @returns User information with email and name
     */
    private async getUserInfo(userId: string): Promise<{ email: string; name: string } | null> {
        try {
            // Use the Keycloak API to get user details
            const userDetails = await this.keycloakApiService.getUserById(userId);
            if (userDetails) {
                return {
                    email: userDetails.email || `user-${userId}@example.com`,
                    name: `${userDetails.firstName || ''} ${userDetails.lastName || ''}`.trim() || userDetails.username || `User ${userId}`
                };
            }
            return null;
        } catch (error) {
            console.error(`Failed to get user info for ${userId}:`, error);
            return null;
        }
    }

    /**
     * Send notification to a user
     * @param userId ID of the user to notify
     * @param title Notification title
     * @param message Notification message
     * @throws Error if notification system fails
     */
    private async sendNotification(userId: string, title: string, message: string): Promise<void> {
        try {
            // TODO: Implement actual notification system integration
            // For now, just log the notification
            console.log(`Notification sent to user ${userId}: ${title} - ${message}`);
        } catch (error) {
            throw new Error(`Failed to send notification: ${error.message}`);
        }
    }
}