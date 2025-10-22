import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Ticket } from '../../ticket/models/ticket.schema';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Check if SMTP configuration is provided
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    // SMTP configuration validation
    this.logger.log('Initializing email service...');

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn('SMTP configuration not provided. Email notifications will be disabled.');
      this.logger.warn('To enable email notifications, please configure SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
      return;
    }

    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpSecure = this.configService.get<boolean>('SMTP_SECURE', false);

    const smtpConfig = {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure, // true for 465 (SSL), false for 587 (STARTTLS)
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      // Different TLS config based on port
      ...(smtpPort === 465 ? {
        // For SSL port 465
        tls: {
          rejectUnauthorized: false,
          servername: 'smtp.gmail.com'
        }
      } : {
        // For STARTTLS port 587
        requireTLS: true,
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        }
      })
    };

    this.logger.log(` SMTP transporter initialized (${smtpHost}:${smtpPort})`);

    this.transporter = nodemailer.createTransport(smtpConfig);

    // Test the connection with a simple approach
    this.logger.log('SMTP transporter initialized. Testing connection...');

    // Try to verify connection with timeout
    const verifyWithTimeout = () => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this.logger.warn('SMTP verification timed out. Emails will be sent without verification.');
          resolve(false);
        }, 10000); // 10 second timeout

        this.transporter.verify((error) => {
          clearTimeout(timeout);
          if (error) {
            this.logger.warn(`SMTP verification failed: ${error.message}`);
            this.logger.warn('Emails will still be attempted. This might be a temporary network issue.');
            resolve(false);
          } else {
            this.logger.log(' SMTP server connection verified successfully');
            resolve(true);
          }
        });
      });
    };

    // Run verification in background
    setTimeout(() => {
      verifyWithTimeout();
    }, 2000); // Wait 2 seconds before verifying
  }

  /**
   * Send ticket creation notification to the ticket creator
   */
  async sendTicketCreationNotificationToCreator(
    ticket: Ticket,
    creatorEmail: string,
    creatorName: string
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('SMTP not configured. Skipping ticket creation notification email.');
      return false;
    }

    try {
      const mailOptions = {
        from: `"Y-Nkap Support" <${this.configService.get<string>('SMTP_FROM_EMAIL')}>`,
        to: creatorEmail,
        subject: `Ticket Created: ${ticket.title}`,
        html: this.generateTicketCreationEmailForCreator(ticket, creatorName),
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Ticket creation notification sent to creator: ${creatorEmail}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send ticket creation notification to creator: ${error.message}`);
      return false;
    }
  }

  /**
   * Send ticket assignment notification to the assigned agent
   */
  async sendTicketAssignmentNotificationToAgent(
    ticket: Ticket,
    agentEmail: string,
    agentName: string
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('SMTP not configured. Skipping ticket assignment notification email.');
      return false;
    }

    try {
      const mailOptions = {
        from: `"Y-Nkap Support" <${this.configService.get<string>('SMTP_FROM_EMAIL')}>`,
        to: agentEmail,
        subject: `New Ticket Assigned: ${ticket.title}`,
        html: this.generateTicketAssignmentEmailForAgent(ticket, agentName),
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Ticket assignment notification sent to agent: ${agentEmail}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send ticket assignment notification to agent: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate HTML email template for ticket creator
   */
  private generateTicketCreationEmailForCreator(ticket: Ticket, creatorName: string): string {
    const ticketUrl = `${this.configService.get<string>('FRONTEND_URL')}/tickets/${ticket._id}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ticket Created</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .ticket-info { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #007bff; }
          .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Ticket Created Successfully</h1>
          </div>
          <div class="content">
            <p>Hello ${creatorName},</p>
            <p>Your ticket has been created successfully and assigned to a support agent.</p>
            
            <div class="ticket-info">
              <h3>Ticket Details:</h3>
              <p><strong>Title:</strong> ${ticket.title}</p>
              <p><strong>Type:</strong> ${ticket.type}</p>
              <p><strong>Status:</strong> ${ticket.status}</p>
              <p><strong>Created:</strong> ${new Date(ticket.createdAt).toLocaleString()}</p>
              <p><strong>Description:</strong> ${ticket.description}</p>
            </div>
            
            <p>You can track the progress of your ticket by clicking the button below:</p>
            <p style="text-align: center;">
              <a href="${ticketUrl}" class="button">View Ticket</a>
            </p>
            
            <p>Our support team will review your ticket and respond as soon as possible.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Y-Nkap Support System.</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate HTML email template for assigned agent
   */
  private generateTicketAssignmentEmailForAgent(ticket: Ticket, agentName: string): string {
    const ticketUrl = `${this.configService.get<string>('FRONTEND_URL')}/admin/tickets/${ticket._id}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Ticket Assigned</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .ticket-info { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #28a745; }
          .button { display: inline-block; padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .priority { background: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Ticket Assigned</h1>
          </div>
          <div class="content">
            <p>Hello ${agentName},</p>
            <p>A new ticket has been assigned to you. Please review and respond as soon as possible.</p>
            
            <div class="ticket-info">
              <h3>Ticket Details:</h3>
              <p><strong>Title:</strong> ${ticket.title}</p>
              <p><strong>Type:</strong> ${ticket.type}</p>
              <p><strong>Status:</strong> ${ticket.status}</p>
              <p><strong>Created:</strong> ${new Date(ticket.createdAt).toLocaleString()}</p>
              <p><strong>Description:</strong> ${ticket.description}</p>
              ${ticket.isUrgent ? '<div class="priority"><strong>⚠️ URGENT TICKET</strong></div>' : ''}
            </div>
            
            <p>Please click the button below to view and respond to this ticket:</p>
            <p style="text-align: center;">
              <a href="${ticketUrl}" class="button">View & Respond</a>
            </p>
            
            <p><strong>Action Required:</strong></p>
            <ul>
              <li>Review the ticket details</li>
              <li>Update the ticket status to "IN_PROGRESS"</li>
              <li>Respond to the user with appropriate information</li>
              <li>Keep the user updated on the progress</li>
            </ul>
          </div>
          <div class="footer">
            <p>This is an automated message from Y-Nkap Support System.</p>
            <p>Please ensure timely response to maintain customer satisfaction.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send a generic email notification
   */
  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    from?: string
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('SMTP not configured. Skipping email send.');
      return false;
    }

    try {
      const mailOptions = {
        from: from || `"Y-Nkap Support" <${this.configService.get<string>('SMTP_FROM_EMAIL')}>`,
        to,
        subject,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to: ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      return false;
    }
  }

  /**
   * Test email configuration
   */
  // async testEmailConfiguration(): Promise<boolean> {
  //   if (!this.transporter) {
  //     this.logger.warn('SMTP not configured. Cannot test email configuration.');
  //     return false;
  //   }

  //   try {
  //     const testEmail = this.configService.get<string>('SMTP_TEST_EMAIL');
  //     if (!testEmail) {
  //       this.logger.warn('SMTP_TEST_EMAIL not configured, skipping test');
  //       return false;
  //     }

  //     this.logger.log(' Testing email configuration...');

  //     const mailOptions = {
  //       from: `"Y-Nkap Support" <${this.configService.get<string>('SMTP_FROM_EMAIL')}>`,
  //       to: testEmail,
  //       subject: 'Y-Nkap Email Configuration Test',
  //       html: `
  //         <h2> Email Configuration Test Successful!</h2>
  //         <p>This is a test email to verify that the email configuration is working correctly.</p>
  //         <p>If you receive this email, the email service is properly configured.</p>
  //         <p><strong>Configuration Details:</strong></p>
  //         <ul>
  //           <li>SMTP Host: ${this.configService.get<string>('SMTP_HOST')}</li>
  //           <li>SMTP Port: ${this.configService.get<string>('SMTP_PORT')}</li>
  //           <li>From Email: ${this.configService.get<string>('SMTP_FROM_EMAIL')}</li>
  //         </ul>
  //         <p>Timestamp: ${new Date().toISOString()}</p>
  //       `,
  //     };

  //     await this.transporter.sendMail(mailOptions);
  //     this.logger.log(' Email configuration test successful! Check your inbox.');
  //     return true;
  //   } catch (error) {
  //     this.logger.error(` Email configuration test failed: ${error.message}`);
  //     return false;
  //   }
  // }
} 