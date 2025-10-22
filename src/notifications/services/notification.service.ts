import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from '../schemas/notification.schema';
import { CreateNotificationDto, NotificationType } from '../dto/create-notification.dto';
import { EmailService } from './email.service';
import { Ticket } from '../../ticket/models/ticket.schema';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    public emailService: EmailService // Make public so it can be accessed from TicketService
  ) {}

  /**
   * Create a notification in the database
   */
  async createNotification(createNotificationDto: CreateNotificationDto): Promise<NotificationDocument> {
    try {
      const notification = new this.notificationModel(createNotificationDto);
      const savedNotification = await notification.save();
      this.logger.log(`Notification created for user: ${createNotificationDto.userId}`);
      return savedNotification;
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send ticket creation notifications (both database and email)
   */
  async sendTicketCreationNotifications(
    ticket: Ticket,
    creatorUserId: string,
    creatorEmail: string,
    creatorName: string,
    agentUserId: string,
    agentEmail: string,
    agentName: string
  ): Promise<void> {
    try {
      // Create database notifications
      await Promise.all([
        this.createNotification({
          title: 'Ticket Created Successfully',
          message: `Your ticket "${ticket.title}" has been created and assigned to a support agent.`,
          userId: creatorUserId,
          type: NotificationType.TICKET,
          relatedEntityId: ticket._id.toString(),
          relatedEntityType: 'ticket',
          metadata: {
            ticketId: ticket._id,
            ticketTitle: ticket.title,
            ticketType: ticket.type,
            action: 'created'
          }
        }),
        this.createNotification({
          title: 'New Ticket Assigned',
          message: `A new ticket "${ticket.title}" has been assigned to you.`,
          userId: agentUserId,
          type: NotificationType.TICKET,
          relatedEntityId: ticket._id.toString(),
          relatedEntityType: 'ticket',
          metadata: {
            ticketId: ticket._id,
            ticketTitle: ticket.title,
            ticketType: ticket.type,
            action: 'assigned'
          }
        })
      ]);

      // Send email notifications
      await Promise.all([
        this.emailService.sendTicketCreationNotificationToCreator(ticket, creatorEmail, creatorName),
        this.emailService.sendTicketAssignmentNotificationToAgent(ticket, agentEmail, agentName)
      ]);

      this.logger.log(`Ticket creation notifications sent successfully for ticket: ${ticket._id}`);
    } catch (error) {
      this.logger.error(`Failed to send ticket creation notifications: ${error.message}`);
      // Don't throw error to avoid breaking ticket creation flow
    }
  }

  /**
   * Send ticket status update notifications
   */
  async sendTicketStatusUpdateNotification(
    ticket: Ticket,
    userId: string,
    userEmail: string,
    userName: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    try {
      // Create database notification
      await this.createNotification({
        title: 'Ticket Status Updated',
        message: `Your ticket "${ticket.title}" status has been updated from ${oldStatus} to ${newStatus}.`,
        userId,
        type: NotificationType.TICKET,
        relatedEntityId: ticket._id.toString(),
        relatedEntityType: 'ticket',
        metadata: {
          ticketId: ticket._id,
          ticketTitle: ticket.title,
          oldStatus,
          newStatus,
          action: 'status_updated'
        }
      });

      // Send email notification
      await this.emailService.sendEmail(
        userEmail,
        `Ticket Status Updated: ${ticket.title}`,
        this.generateStatusUpdateEmail(ticket, userName, oldStatus, newStatus)
      );

      this.logger.log(`Status update notification sent for ticket: ${ticket._id}`);
    } catch (error) {
      this.logger.error(`Failed to send status update notification: ${error.message}`);
    }
  }

  /**
   * Send ticket message notifications
   */
  async sendTicketMessageNotification(
    ticket: Ticket,
    recipientUserId: string,
    recipientEmail: string,
    recipientName: string,
    senderName: string,
    messageContent: string
  ): Promise<void> {
    try {
      // Create database notification
      await this.createNotification({
        title: 'New Message on Ticket',
        message: `${senderName} sent a new message on ticket "${ticket.title}".`,
        userId: recipientUserId,
        type: NotificationType.TICKET,
        relatedEntityId: ticket._id.toString(),
        relatedEntityType: 'ticket',
        metadata: {
          ticketId: ticket._id,
          ticketTitle: ticket.title,
          senderName,
          messagePreview: messageContent.substring(0, 100) + (messageContent.length > 100 ? '...' : ''),
          action: 'new_message'
        }
      });

      // Send email notification
      await this.emailService.sendEmail(
        recipientEmail,
        `New Message: ${ticket.title}`,
        this.generateMessageNotificationEmail(ticket, recipientName, senderName, messageContent)
      );

      this.logger.log(`Message notification sent for ticket: ${ticket._id}`);
    } catch (error) {
      this.logger.error(`Failed to send message notification: ${error.message}`);
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId: string, limit: number = 50, offset: number = 0): Promise<NotificationDocument[]> {
    try {
      return await this.notificationModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec();
    } catch (error) {
      this.logger.error(`Failed to get notifications for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get unread notifications count for a user
   */
  async getUnreadNotificationsCount(userId: string): Promise<number> {
    try {
      return await this.notificationModel.countDocuments({ userId, isRead: false });
    } catch (error) {
      this.logger.error(`Failed to get unread notifications count for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<NotificationDocument> {
    try {
      return await this.notificationModel.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      );
    } catch (error) {
      this.logger.error(`Failed to mark notification as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      await this.notificationModel.updateMany(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );
      this.logger.log(`All notifications marked as read for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to mark all notifications as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      await this.notificationModel.findOneAndDelete({ _id: notificationId, userId });
      this.logger.log(`Notification deleted: ${notificationId}`);
    } catch (error) {
      this.logger.error(`Failed to delete notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate status update email template
   */
  private generateStatusUpdateEmail(ticket: Ticket, userName: string, oldStatus: string, newStatus: string): string {
    const ticketUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/tickets/${ticket._id}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ticket Status Updated</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #17a2b8; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .status-change { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #17a2b8; }
          .button { display: inline-block; padding: 10px 20px; background: #17a2b8; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Ticket Status Updated</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>The status of your ticket has been updated.</p>
            
            <div class="status-change">
              <h3>Status Change:</h3>
              <p><strong>Ticket:</strong> ${ticket.title}</p>
              <p><strong>Previous Status:</strong> ${oldStatus}</p>
              <p><strong>New Status:</strong> ${newStatus}</p>
              <p><strong>Updated:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <p>Click the button below to view your ticket:</p>
            <p style="text-align: center;">
              <a href="${ticketUrl}" class="button">View Ticket</a>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated message from Y-Nkap Support System.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate message notification email template
   */
  private generateMessageNotificationEmail(ticket: Ticket, recipientName: string, senderName: string, messageContent: string): string {
    const ticketUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/tickets/${ticket._id}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Message on Ticket</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6f42c1; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .message { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #6f42c1; }
          .button { display: inline-block; padding: 10px 20px; background: #6f42c1; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Message Received</h1>
          </div>
          <div class="content">
            <p>Hello ${recipientName},</p>
            <p>You have received a new message on your ticket.</p>
            
            <div class="message">
              <h3>Message Details:</h3>
              <p><strong>Ticket:</strong> ${ticket.title}</p>
              <p><strong>From:</strong> ${senderName}</p>
              <p><strong>Message:</strong></p>
              <p style="background: #f8f9fa; padding: 10px; border-radius: 5px;">${messageContent}</p>
            </div>
            
            <p>Click the button below to view and respond:</p>
            <p style="text-align: center;">
              <a href="${ticketUrl}" class="button">View Ticket</a>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated message from Y-Nkap Support System.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
} 
