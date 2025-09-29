import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Inject, forwardRef } from "@nestjs/common";
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
import { EnhancedTicket, UserInfo } from "../interfaces/enhanced-ticket.interface";
import { MessageService } from "../../message/services/message.service";
import { NotificationType } from "../../notifications/dto/create-notification.dto";
import { TicketStatusManagementService } from "./ticket-status-management.service";
import { AttachmentService } from "../../attachment/services/attachment.service";
import { RecaptchaService } from "../../shared/services/recaptcha.service";

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
        private notificationService: NotificationService,
        private messageService: MessageService,
        private statusManagementService: TicketStatusManagementService,
        @Inject(forwardRef(() => AttachmentService))
        private attachmentService: AttachmentService,
        private recaptchaService: RecaptchaService
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
     * Update existing tickets without priority field to have default 'Low' priority
     * This method should be called once to migrate old tickets
     */
    async migratePriorityField(): Promise<void> {
        try {
            const result = await this.ticketModel.updateMany(
                {
                    $or: [
                        { priority: { $exists: false } },
                        { priority: 0 },
                        { priority: null },
                        { priority: { $nin: ['High', 'Medium', 'Low'] } }
                    ]
                },
                { $set: { priority: 'Low' } }
            );
            console.log(`Updated ${result.modifiedCount} tickets with default priority 'Low'`);
        } catch (error) {
            console.error('Error migrating priority field:', error);
        }
    }

    /**
     * Create a new ticket
     * @param createTicketDto Ticket creation data
     * @param req Request object containing user information
     * @returns Created ticket document
     */
    async createTicket(createTicketDto: CreateTicketDTO, req: any): Promise<TicketDocument> {
        try {
            // Verify reCAPTCHA token if provided
            if (createTicketDto.captchaToken) {
                const isValidCaptcha = await this.recaptchaService.verifyToken(
                    createTicketDto.captchaToken,
                    req.ip || req.connection.remoteAddress
                );
                
                if (!isValidCaptcha) {
                    throw new BadRequestException('Invalid reCAPTCHA verification. Please try again.');
                }
            }
            
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

                // Get attachment details if provided
                let attachmentDetails = [];
                if (createTicketDto.attachments && createTicketDto.attachments.length > 0) {
                    attachmentDetails = await this.attachmentService.getAttachmentDetails(createTicketDto.attachments);
                    
                    // Link attachments to the ticket and first message
                    await this.attachmentService.linkAttachmentsToTicket(
                        createTicketDto.attachments,
                        null, // Will be set after ticket creation
                        null  // Will be set after message creation
                    );
                }

                const initialMessage = {
                    sender: req['user']['sub'],
                    content: createTicketDto.description,
                    createdAt: new Date(),
                    attachments: createTicketDto.attachments || [],
                    relatedFaqs: [],
                    isDescription: true,  // Mark this as the ticket description message
                    attachmentDetails: attachmentDetails.map(att => ({
                        attachmentId: att._id,
                        fileName: att.originalName || att.fileName,
                        fileType: att.fileType,
                        fileSize: att.fileSize,
                        url: att.url,
                        thumbnailUrl: att.thumbnailUrl
                    }))
                };

                const newTicket = this.createInstance({
                    ...createTicketDto,
                    user: req['user']['sub'],
                    assignTo: solver,
                    messages: [initialMessage],
                    attachments: createTicketDto.attachments || [],
                    relatedFaqs: [],
                    notificationHistory: []
                });

                await newTicket.save({ session });
                
                // Link attachments to the ticket
                if (createTicketDto.attachments && createTicketDto.attachments.length > 0) {
                    await this.attachmentService.linkAttachmentsToTicket(
                        createTicketDto.attachments,
                        newTicket._id.toString(),
                        null // Embedded messages don't have separate _id
                    );
                }
                console.log('Created ticket with messages:', newTicket.messages);
                console.log('Number of messages in new ticket:', newTicket.messages.length);
                
                await this.ticketHistoryService.createHistory(newTicket._id, null, TicketStatus.OPENED, req['user']['sub']);
                
                // Send comprehensive notifications (database + email)
                try {
                    // Get user information for notifications
                    console.log(' Getting user info for notifications...');
                    console.log('  - Creator ID:', req['user']['sub']);
                    console.log('  - Agent ID:', solver);

                    const creatorInfo = await this.getUserInfo(req['user']['sub']);
                    const agentInfo = await this.getUserInfo(solver);

                    console.log('  - Creator info found:', creatorInfo ? 'YES' : 'NO');
                    console.log('  - Agent info found:', agentInfo ? 'YES' : 'NO');

                    if (creatorInfo) {
                        console.log('  - Creator email:', creatorInfo.email);
                    }
                    if (agentInfo) {
                        console.log('  - Agent email:', agentInfo.email);
                    }

                    // Send notifications - handle missing agent info gracefully
                    if (creatorInfo && agentInfo) {
                        // Both users found - send both notifications
                        console.log(' Sending notifications to both creator and agent');
                        await this.notificationService.sendTicketCreationNotifications(
                            newTicket,
                            req['user']['sub'], // creator user ID
                            creatorInfo.email,
                            this.getDisplayName(creatorInfo),
                            solver, // agent user ID
                            agentInfo.email,
                            this.getDisplayName(agentInfo)
                        );
                    } else if (creatorInfo) {
                        // Only creator info found - send creator notification only
                        console.log(' Sending notification to creator only (agent info not found)');
                        console.warn(' Agent information not found due to Keycloak API issues');
                        console.warn(' Agent will not receive notification, but ticket creation continues');

                        // Create individual notifications manually
                        await this.notificationService.createNotification({
                            title: 'Ticket Created Successfully',
                            message: `Your ticket "${newTicket.title}" has been created and assigned to a support agent.`,
                            type: NotificationType.TICKET,
                            userId: req['user']['sub'],
                            relatedEntityType: 'TICKET',
                            relatedEntityId: newTicket._id.toString(),
                        });

                        // Send email to creator
                        await this.notificationService.emailService.sendTicketCreationNotificationToCreator(
                            newTicket,
                            creatorInfo.email,
                            this.getDisplayName(creatorInfo)
                        );

                        // Log agent notification failure for monitoring
                        console.log(` MONITORING: Agent notification failed for ticket ${newTicket._id} due to Keycloak API issues`);

                    } else {
                        console.error(' Both creator and agent information not found - likely Keycloak API outage');
                        console.error(' No notifications sent, but ticket creation continues');
                        console.log(` MONITORING: All notifications failed for ticket ${newTicket._id} due to Keycloak API issues`);
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
     * Get tickets for a user based on their role with user information populated
     * @param req Request object containing user information
     * @returns Array of tickets with user details
     */
    async getTicketsForUser(req: any): Promise<EnhancedTicket[]> {
        // Extract user info from JWT token
        const user = req['user'] || req.user;
        if (!user) {
            console.log('🔍 Service: No user found in request');
            return [];
        }
        
        const roles = user['realm_access']?.['roles'] || user.roles || [];
        const userId = user['sub'] || user.id;

        console.log('🔍 Service: getTicketsForUser called');
        console.log('🔍 Service: User ID:', userId);
        console.log('🔍 Service: User roles:', roles);

        // Check if user is a solver/agent (has any solver role)
        const isSolver = roles.some(role =>
            role.includes('solver') ||
            role.includes('manager') ||
            role.includes('admin')
        );

        console.log('🔍 Service: Is solver:', isSolver);

        let tickets: Ticket[] = [];
        let query: any;

        if (isSolver) {
            // For solvers/agents, show both tickets they created AND tickets assigned to them
            query = {
                $or: [
                    { user: userId },        // Tickets they created
                    { assignTo: userId }     // Tickets assigned to them
                ]
            };
        } else {
            // For regular users, show only tickets they created
            query = { user: userId };
        }

        console.log('🔍 Service: Database query:', JSON.stringify(query, null, 2));
        
        // First, let's check if ANY tickets exist in the database
        const allTickets = await this.findByField({});
        console.log('🔍 Service: Total tickets in database:', allTickets.length);
        
        if (allTickets.length > 0) {
            console.log('🔍 Service: Sample ticket owners:', allTickets.slice(0, 3).map(t => ({ id: t._id, user: t.user, assignTo: t.assignTo })));
        }
        
        // Sort by newest first (createdAt descending) and ensure priority field exists
        tickets = await this.ticketModel.find(query)
            .sort({ createdAt: -1 })
            .exec();
        
        // Ensure all tickets have priority field (default to 'Low' for old tickets)
        tickets = tickets.map(ticket => {
            if (!ticket.priority) {
                ticket.priority = 'Low';
            }
            return ticket;
        });
        
        console.log('🔍 Service: Raw tickets from DB:', tickets.length);
        if (tickets.length > 0) {
            console.log('🔍 Service: First ticket sample:', {
                id: tickets[0]._id,
                user: tickets[0].user,
                assignTo: tickets[0].assignTo,
                title: tickets[0].title
            });
        }

        console.log('User roles:', roles);
        console.log('Is solver:', isSolver);
        console.log('User ID:', userId);
        console.log('Found tickets:', tickets.length);

        // Enhance tickets with user information
        const enhancedTickets = await Promise.all(
            tickets.map(async (ticket) => {
                const ticketObj = ticket.toObject() as any;

                // Get creator info
                const creatorInfo = await this.getUserInfo(ticket.user);
                if (creatorInfo) {
                    ticketObj.createdBy = {
                        _id: creatorInfo._id,
                        username: creatorInfo.username,
                        email: creatorInfo.email,
                        firstName: creatorInfo.firstName,
                        lastName: creatorInfo.lastName,
                        roles: creatorInfo.roles
                    };
                }

                // Note: assignedTo field removed from frontend interface

                // Enhance messages with sender info
                if (ticketObj.messages && ticketObj.messages.length > 0) {
                    ticketObj.messages = await Promise.all(
                        ticketObj.messages.map(async (message: any) => {
                            const senderInfo = await this.getUserInfo(message.sender);
                            return {
                                ...message,
                                senderName: senderInfo ? this.getDisplayName(senderInfo) : 'Unknown User',
                                senderEmail: senderInfo?.email || ''
                            };
                        })
                    );
                }

                // Add ownership information
                ticketObj.isOwnedByUser = ticket.user === userId;
                ticketObj.isAssignedToUser = ticket.assignTo === userId;

                return ticketObj;
            })
        );

        return enhancedTickets;
    }

    /**
     * Get tickets for a user by status with user information populated
     * @param req Request object containing user information
     * @param status Ticket status to filter by
     * @returns Array of tickets with user details
     */
    async getTicketsByStatus(req: any, status: string): Promise<EnhancedTicket[]> {
        const roles = req['user']['realm_access']['roles'];
        const userId = req['user']['sub'];
        
        // Normalize status to handle both old and new status values
        let normalizedStatus: TicketStatus;
        switch (status.toUpperCase()) {
            case 'OPEN':
                normalizedStatus = TicketStatus.OPENED;
                break;
            case 'SOLVE':
                normalizedStatus = TicketStatus.SOLVED;
                break;
            case 'CLOSE':
                normalizedStatus = TicketStatus.CLOSED;
                break;
            default:
                normalizedStatus = status.toUpperCase() as TicketStatus;
        }

        console.log(`🔍 getTicketsByStatus - Original status: ${status}, Normalized: ${normalizedStatus}`);

        // Check if user is a solver/agent (has any solver role)
        const isSolver = roles.some(role =>
            role.includes('solver') ||
            role.includes('manager') ||
            role.includes('admin')
        );

        let tickets: Ticket[] = [];

        if (isSolver) {
            // For solvers/agents, show both tickets they created AND tickets assigned to them
            tickets = await this.ticketModel.find({
                $or: [
                    { user: userId },        // Tickets they created
                    { assignTo: userId }     // Tickets assigned to them
                ],
                status: normalizedStatus
            })
            .sort({ createdAt: -1 })
            .exec();
        } else {
            // For regular users, show only tickets they created
            tickets = await this.ticketModel.find({
                user: userId,
                status: normalizedStatus
            })
            .sort({ createdAt: -1 })
            .exec();
        }
        
        // Ensure all tickets have priority field (default to 'Low' for old tickets)
        tickets = tickets.map(ticket => {
            if (!ticket.priority) {
                ticket.priority = 'Low';
            }
            return ticket;
        });

        console.log('🔍 getTicketsByStatus results:', {
            userRoles: roles,
            isSolver: isSolver,
            userId: userId,
            originalStatus: status,
            normalizedStatus: normalizedStatus,
            foundTickets: tickets.length
        });

        // Enhance tickets with user information
        const enhancedTickets = await Promise.all(
            tickets.map(async (ticket) => {
                const ticketObj = ticket.toObject() as any;

                // Get creator info
                const creatorInfo = await this.getUserInfo(ticket.user);
                if (creatorInfo) {
                    ticketObj.createdBy = {
                        _id: creatorInfo._id,
                        username: creatorInfo.username,
                        email: creatorInfo.email,
                        firstName: creatorInfo.firstName,
                        lastName: creatorInfo.lastName,
                        roles: creatorInfo.roles
                    };
                }

                // Note: assignedTo field removed from frontend interface

                // Enhance messages with sender info
                if (ticketObj.messages && ticketObj.messages.length > 0) {
                    ticketObj.messages = await Promise.all(
                        ticketObj.messages.map(async (message: any) => {
                            const senderInfo = await this.getUserInfo(message.sender);
                            return {
                                ...message,
                                senderName: senderInfo ? this.getDisplayName(senderInfo) : 'Unknown User',
                                senderEmail: senderInfo?.email || ''
                            };
                        })
                    );
                }

                // Add ownership information
                ticketObj.isOwnedByUser = ticket.user === userId;
                ticketObj.isAssignedToUser = ticket.assignTo === userId;

                return ticketObj;
            })
        );

        return enhancedTickets;
    }

    /**
     * Get a single ticket by ID with user information populated
     * @param ticketId Ticket ID
     * @param req Request object containing user information
     * @returns Ticket with user details
     */
    async getTicketByIdWithUserInfo(ticketId: string, req: any): Promise<EnhancedTicket> {
        const ticket = await this.findOneByField({ _id: ticketId });
        if (!ticket) {
            throw new NotFoundException('Ticket not found');
        }

        const ticketObj = ticket.toObject() as any;

        // Get creator info
        const creatorInfo = await this.getUserInfo(ticket.user);
        if (creatorInfo) {
            ticketObj.createdBy = {
                _id: creatorInfo._id,
                username: creatorInfo.username,
                email: creatorInfo.email,
                firstName: creatorInfo.firstName,
                lastName: creatorInfo.lastName,
                roles: creatorInfo.roles
            };
        }

        // Note: assignedTo field removed from frontend interface

        // Enhance messages with sender info and ensure attachment details are included
        if (ticketObj.messages && ticketObj.messages.length > 0) {
            ticketObj.messages = await Promise.all(
                ticketObj.messages.map(async (message: any) => {
                    const senderInfo = await this.getUserInfo(message.sender);
                    
                    // Ensure attachment details are properly formatted
                    let attachmentDetails = message.attachmentDetails || [];
                    if (message.attachments && message.attachments.length > 0 && attachmentDetails.length === 0) {
                        // Fallback: get attachment details from attachment service
                        try {
                            attachmentDetails = await this.attachmentService.getAttachmentDetails(message.attachments);
                        } catch (error) {
                            console.warn('Could not fetch attachment details:', error);
                            attachmentDetails = [];
                        }
                    }
                    
                    return {
                        ...message,
                        senderName: senderInfo ? this.getDisplayName(senderInfo) : 'Unknown User',
                        senderEmail: senderInfo?.email || '',
                        attachmentDetails: attachmentDetails
                    };
                })
            );
        }

        // Add ownership information
        const userId = req['user']['sub'];
        ticketObj.isOwnedByUser = ticket.user === userId;
        ticketObj.isAssignedToUser = ticket.assignTo === userId;

        return ticketObj;
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
            const userId = req['user']['sub'];
            const currentStatus = ticket.status;
            const newStatus = updateStatusDto.newStatus as TicketStatus;

            // Create status change request
            const statusChangeRequest = {
                ticketId: id,
                currentStatus,
                newStatus,
                reason: updateStatusDto.reason,
                resolutionNotes: updateStatusDto.resolutionNotes,
                rejectionReason: updateStatusDto.rejectionReason
            };

            // Validate status transition using the status management service
            const validation = this.statusManagementService.validateStatusTransition(
                statusChangeRequest,
                roles,
                ticket,
                { sub: userId, roles }
            );

            if (!validation.isValid) {
                throw new BadRequestException(validation.error);
            }

            // Update ticket status
            ticket.status = newStatus;

            // Update additional fields based on status
            if (newStatus === TicketStatus.SOLVED && updateStatusDto.resolutionNotes) {
                ticket.resolutionNotes = updateStatusDto.resolutionNotes;
                ticket.resolutionDate = new Date();
            }

            if (newStatus === TicketStatus.CLOSED) {
                if (currentStatus !== TicketStatus.SOLVED && updateStatusDto.rejectionReason) {
                    ticket.rejectionReason = updateStatusDto.rejectionReason;
                }
            }

            await ticket.save({ session });

            // Create history record
            await this.ticketHistoryService.createHistory(
                ticket._id,
                currentStatus,
                newStatus,
                userId
            );

            // Log status change
            this.statusManagementService.logStatusChange(
                id,
                currentStatus,
                newStatus,
                userId,
                updateStatusDto.reason
            );

            // Send status update notifications
            try {
                const ticketOwnerInfo = await this.getUserInfo(ticket.user);
                if (ticketOwnerInfo) {
                    await this.notificationService.sendTicketStatusUpdateNotification(
                        ticket,
                        ticket.user,
                        ticketOwnerInfo.email,
                        this.getDisplayName(ticketOwnerInfo),
                        currentStatus,
                        newStatus
                    );
                }
            } catch (notificationError) {
                console.error('Failed to send status update notifications:', notificationError);
                // Don't fail status update if notifications fail
            }
        }).catch((error) => {
            throw error;
        });
    }

    /**
     * Get user permissions for a specific ticket
     * @param ticketId Ticket ID
     * @param req Request object containing user information
     * @returns User permissions for the ticket
     */
    async getTicketPermissions(ticketId: string, req: any): Promise<any> {
        const ticket = await this.findOneByField({ _id: ticketId });
        if (!ticket) {
            throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
        }

        const roles = req['user']['realm_access']['roles'];
        const userId = req['user']['sub'];

        const permissions = this.statusManagementService.getUserPermissions(
            ticket,
            roles,
            userId
        );

        return {
            ...permissions,
            currentStatus: ticket.status,
            ticketId: ticketId
        };
    }

    /**
     * Get status workflow information
     * @returns Status workflow configuration
     */
    getStatusWorkflow(): any {
        return this.statusManagementService.getStatusWorkflow();
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

        // Get attachment details if provided
        let attachmentDetails = [];
        if (messageDto.attachments && messageDto.attachments.length > 0) {
            attachmentDetails = await this.attachmentService.getAttachmentDetails(messageDto.attachments);
            // Link attachments to the ticket
            await this.attachmentService.linkAttachmentsToTicket(
                messageDto.attachments,
                ticketId
            );
        }

        const message = {
            sender: req['user']['sub'],
            content: messageDto.content,
            createdAt: new Date(),
            attachments: messageDto.attachments || [],
            relatedFaqs: messageDto.relatedFaqs || [],
            attachmentDetails: attachmentDetails
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
     * Get display name from user info
     * @param userInfo User information object
     * @returns Display name string
     */
    public getDisplayName(userInfo: UserInfo): string {
        const fullName = [userInfo.firstName, userInfo.lastName].filter(Boolean).join(' ').trim();
        return fullName || userInfo.username || 'Unknown User';
    }

    /**
     * Get user information from Keycloak using the admin API with retry logic
     * @param userId User ID to get information for
     * @returns User information with email and username
     */
    public async getUserInfo(userId: string): Promise<UserInfo | null> {
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(` Attempting to get user info for ${userId} (attempt ${attempt}/${maxRetries})`);

                // Use the Keycloak API to get user details
                const userDetails = await this.keycloakApiService.getUserById(userId);

                if (userDetails) {
                    console.log(` Successfully retrieved user info for ${userId}`);
                    return {
                        _id: userId,
                        username: userDetails.username || `User ${userId}`,
                        email: userDetails.email || `user-${userId}@example.com`,
                        firstName: userDetails.firstName,
                        lastName: userDetails.lastName,
                        roles: userDetails.roles || []
                    };
                }

                console.log(` User details not found for ${userId}`);
                return null;

            } catch (error) {
                console.error(` Attempt ${attempt} failed for user ${userId}:`, error.message);

                // Check if it's a network/server error that might be temporary
                const isRetryableError = error.code === 'ECONNRESET' ||
                                       error.response?.status >= 500 ||
                                       error.message.includes('socket hang up') ||
                                       error.message.includes('Proxy Error');

                if (attempt === maxRetries || !isRetryableError) {
                    console.error(` ${isRetryableError ? 'All retries failed' : 'Non-retryable error'} for user ${userId}`);
                    return null;
                }

                // Wait before retrying
                console.log(` Waiting ${retryDelay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }

        return null;
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

    /**
     * Delete a message from a ticket
     * @param ticketId ID of the ticket
     * @param messageId ID of the message to delete
     * @param req Request object containing user information
     * @returns Success message
     */
    async deleteMessage(ticketId: string, messageId: string, req: any): Promise<any> {
        try {
            console.log(' Deleting message:', messageId, 'from ticket:', ticketId);
            console.log(' User ID:', req['user']['sub']);

            // Verify ticket exists
            console.log(' Looking for ticket with ID:', ticketId);
            const ticket = await this.findOneByField({ _id: ticketId });
            console.log(' Ticket found:', ticket ? 'YES' : 'NO');

            if (!ticket) {
                console.error(' Ticket not found in database');
                throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
            }

        // Get the message from the Message collection
        console.log(' Looking for message with ID:', messageId);
        const message = await this.messageService.getMessageById(messageId);
        console.log(' Message found:', message ? 'YES' : 'NO');

        if (!message) {
            console.error(' Message not found in database');
            throw new NotFoundException(`Message with ID ${messageId} not found`);
        }

        // Verify the message belongs to the ticket
        // Convert both IDs to strings for proper comparison
        const ticketIdString = ticketId.toString();
        const messageTicketIdString = message.ticket.toString();

        console.log(' Ticket ID comparison:');
        console.log('  - URL ticket ID:', ticketId);
        console.log('  - URL ticket ID (string):', ticketIdString);
        console.log('  - Message ticket ID:', message.ticket);
        console.log('  - Message ticket ID (string):', messageTicketIdString);
        console.log('  - Are they equal?', messageTicketIdString === ticketIdString);

        if (messageTicketIdString !== ticketIdString) {
            console.error(' Ticket ID mismatch!');
            console.error('  - Expected:', ticketIdString);
            console.error('  - Got:', messageTicketIdString);
            throw new BadRequestException('Message does not belong to this ticket');
        }

        console.log(' Message to delete:', {
            id: message._id,
            sender: message.sender,
            content: message.content?.substring(0, 50) + '...',
            isDescription: message.isDescription,
            createdAt: message.createdAt
        });

        // Check authorization - users can only delete their own messages
        const isMessageOwner = message.sender === req['user']['sub'];
        const isUserAdmin = req['user']['realm_access']['roles'].includes('admin');

        if (!isMessageOwner && !isUserAdmin) {
            throw new ForbiddenException('You can only delete your own messages');
        }

        // Don't allow deletion of ticket description
        if (message.isDescription) {
            throw new ForbiddenException('Cannot delete ticket description');
        }

        // Delete the message using MessageService with socket emission
        await this.messageService.deleteMessageWithSocketEmission(messageId, ticketId);
        console.log(' Message deleted successfully from database');

        return {
            message: 'Message deleted successfully',
            deletedMessageId: messageId,
            ticketId: ticketId
        };

        } catch (error) {
            console.error(' Error in deleteMessage:', error);
            console.error(' Error stack:', error.stack);
            throw error; // Re-throw the error so it's handled by NestJS
        }
    }
}