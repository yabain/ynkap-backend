import { Injectable } from '@nestjs/common';
import { AiService } from './ai.service';
import { TicketService } from '../ticket/services/ticket.services';
import { MessageService } from '../message/services/message.service';

@Injectable()
export class AgentHandoffService {
  private activeTickets = new Map<string, { hasAiResponses: boolean, lastActivity: Date }>();

  constructor(
    private aiService: AiService,
    private ticketService: TicketService,
    private messageService: MessageService
  ) {}

  /**
   * Track when AI responds to a ticket
   */
  trackAiResponse(ticketId: string): void {
    this.activeTickets.set(ticketId, {
      hasAiResponses: true,
      lastActivity: new Date()
    });
    console.log(`🤖 Tracking AI activity for ticket ${ticketId}`);
  }

  /**
   * Check if agent just came online and trigger handoff
   */
  async checkForAgentHandoff(ticketId: string, agentId: string, chatGateway: any): Promise<void> {
    try {
      // Get the ticket to check if it has AI responses
      const ticket = await this.ticketService.findOneByField({ _id: ticketId });
      if (!ticket) {
        console.log(`Ticket ${ticketId} not found for handoff check`);
        return;
      }

      // Check if ticket has AI responses by looking at messages
      const hasAiMessages = ticket.messages?.some(msg => msg.sender === 'ai_bot');
      const ticketData = this.activeTickets.get(ticketId);
      
      if (!hasAiMessages && !ticketData?.hasAiResponses) {
        console.log(`No AI responses found for ticket ${ticketId}, skipping handoff`);
        return; // No AI responses to hand off from
      }

      // Check if agent is now available
      const isAgentAvailable = await this.aiService.isAgentAvailable(agentId);
      
      if (isAgentAvailable && (hasAiMessages || ticketData?.hasAiResponses)) {
        console.log(`👋 Triggering handoff for ticket ${ticketId} to agent ${agentId}`);
        await this.performHandoff(ticketId, agentId, chatGateway);
        
        // Clear tracking since handoff is complete
        this.activeTickets.delete(ticketId);
      } else {
        console.log(`Agent ${agentId} not available or no handoff needed for ticket ${ticketId}`);
      }
    } catch (error) {
      console.error(`Error checking handoff for ticket ${ticketId}:`, error);
    }
  }

  /**
   * Perform the actual handoff
   */
  private async performHandoff(ticketId: string, agentId: string, chatGateway: any): Promise<void> {
    try {
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
      
      // Broadcast handoff message
      chatGateway.server.to(ticketId).emit('newMessage', message);
      chatGateway.server.to(ticketId).emit('agentHandoff', {
        ticketId,
        agentId,
        agentName,
        message: 'Agent has taken over the conversation'
      });

      console.log(`✅ Handoff completed for ticket ${ticketId} to ${agentName}`);
    } catch (error) {
      console.error(`❌ Error during handoff for ticket ${ticketId}:`, error);
    }
  }

  /**
   * Clean up old tracking data
   */
  cleanupOldTracking(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [ticketId, data] of this.activeTickets.entries()) {
      if (data.lastActivity < oneHourAgo) {
        this.activeTickets.delete(ticketId);
      }
    }
  }
}