import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AgentAvailabilityService } from '../user/services/agent-availability.service';
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import { GetAIResponseDTO } from './model/get-ai-response.dto';
import * as fs from 'fs';
import * as path from 'path';

const GEMINI_MODEL = 'gemini-2.0-flash';

interface KnowledgeItem {
  category: string;
  keywords: string[];
  question: string;
  answer: string;
}

@Injectable()
export class AiService {
  private readonly googleAI: GoogleGenerativeAI;
  private readonly model: GenerativeModel;
  private readonly knowledgeBase: KnowledgeItem[];
  private conversationHandlers = new Map<string, 'ai' | 'agent'>();
  
  constructor(
    private agentAvailabilityService: AgentAvailabilityService,
    private configService: ConfigService,
    @Inject(forwardRef(() => 'TicketService')) private ticketService?: any
  ) {
    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.googleAI = new GoogleGenerativeAI(geminiApiKey);
    this.model = this.googleAI.getGenerativeModel({ 
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 200,
      }
    });
    
    // Load knowledge base
    try {
      const knowledgePath = path.join(__dirname, 'knowledge-base.json');
      this.knowledgeBase = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
      console.log(`🧠 Loaded ${this.knowledgeBase.length} knowledge items`);
    } catch (error) {
      console.error('Failed to load knowledge base:', error);
      this.knowledgeBase = [];
    }
  }

  async generateResponse(data: GetAIResponseDTO): Promise<string> {
    const { message, ticketType } = data;
    
    try {
      // RAG: Retrieve relevant knowledge
      const relevantKnowledge = this.retrieveRelevantKnowledge(message);
      
      // Build context-aware prompt
      const contextPrompt = this.buildRAGPrompt(message, relevantKnowledge);
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 8000)
      );
      
      const apiPromise = this.model.generateContent(contextPrompt);
      const result = await Promise.race([apiPromise, timeoutPromise]);
      
      return result.response.text();
    } catch (error) {
      console.log(`🤖 AI Service: Using RAG fallback (${error.message})`);
      return this.ragFallback(message, ticketType);
    }
  }

  private retrieveRelevantKnowledge(message: string): KnowledgeItem[] {
    const lowerMessage = message.toLowerCase();
    
    return this.knowledgeBase
      .filter(item => 
        item.keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()))
      )
      .slice(0, 3); // Limit to top 3 matches
  }

  private buildRAGPrompt(message: string, knowledge: KnowledgeItem[]): string {
    if (knowledge.length === 0) {
      return `You are Y-Nkap's support AI. Always identify yourself when agents are offline. Give a brief, helpful answer (max 2-3 sentences). User: ${message}`;
    }

    const context = knowledge
      .map(item => `Q: ${item.question}\nA: ${item.answer}`)
      .join('\n\n');

    return `You are Y-Nkap's support AI. Always identify yourself when agents are offline. Use ONLY the following knowledge to answer. Be brief (max 2-3 sentences).

Knowledge:
${context}

User: ${message}

Answer based only on the knowledge above. If agents are offline, mention that you are Y-Nkap's support AI:`;
  }

  private async ragFallback(message: string, ticketType?: string): Promise<string> {
    // Try local RAG first
    const relevantKnowledge = this.retrieveRelevantKnowledge(message);
    
    if (relevantKnowledge.length > 0) {
      const bestMatch = relevantKnowledge[0];
      console.log(`🧠 RAG: Found knowledge match for category: ${bestMatch.category}`);
      return bestMatch.answer;
    }
    
    // Fall back to original logic
    return this.localFallback(message, ticketType);
  }

  private async localFallback(message: string, ticketType?: string): Promise<string> {
    console.log(`🤖 AI Service: Local fallback for message: "${message}"`);
    console.log(`🤖 AI Service: This should only be called when no agents are available or agent not engaged`);

    const areAgentsAvailable = await this.areAgentsAvailable(ticketType);
    const lowerMessage = message.toLowerCase();

    // Handle greetings and initial contact
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      if (areAgentsAvailable) {
        return `Hello! Welcome to Y-Nkap support. How can I assist you today? Our support agents are currently online and will respond shortly.`;
      } else {
        return `Hello! I am Y-Nkap's support AI. Our support agents are currently offline, but I'm here to help you in the meantime. What can I help you with?`;
      }
    }

    // Handle username provided for investigation
    if (this.isUsernameProvided(message)) {
      if (areAgentsAvailable) {
        return `Thank you for providing your username. Our support agents are online and will investigate your account shortly. Please wait while they review your information.`;
      } else {
        return `Thank you for providing your username. Our support agents are currently offline, but I've noted your information. They will investigate your account as soon as they're back online. In the meantime, I can help with general questions about Y-Nkap.`;
      }
    }

    // Default response - this should rarely be reached if shouldProvideAiFallback works correctly
    if (areAgentsAvailable) {
      console.log(`🤖 WARNING: Agents are available but AI is still responding - check shouldProvideAiFallback logic`);
      return `Thank you for contacting Y-Nkap support. Our support agents are currently online and will respond shortly. How can I assist you?`;
    } else {
      return `I am Y-Nkap's support AI. Our support agents are currently offline, but I'm here to help you in the meantime. What can I help you with?`;
    }
  }

  private isUsernameProvided(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    // Check if message looks like a username (short, no spaces, or explicitly mentions username)
    return (
      (message.trim().length > 0 && message.trim().length < 20 && !message.includes(' ') && !lowerMessage.includes('hello') && !lowerMessage.includes('hi')) ||
      lowerMessage.includes('username') ||
      lowerMessage.includes('my username is') ||
      lowerMessage.includes('user:')
    );
  }

  async isAgentAvailable(agentId: string): Promise<boolean> {
    return this.agentAvailabilityService.isAgentAvailable(agentId);
  }

  async areAgentsAvailable(ticketType?: string): Promise<boolean> {
    return this.agentAvailabilityService.areAgentsAvailable(ticketType);
  }

  async shouldProvideAiFallback(
    ticketId: string,
    assignedAgentId: string,
    ticketType?: string,
    ticketData?: any
  ): Promise<boolean> {
    console.log(`🤖 AI Service: Checking AI fallback for ticket ${ticketId}`);
    console.log(`🤖 AI Service: Assigned agent: ${assignedAgentId}`);
    
    // Check conversation handler state first
    const currentHandler = this.conversationHandlers.get(ticketId);
    if (currentHandler === 'agent') {
      console.log(`🤖 AI Service: Conversation is handled by agent - no AI fallback`);
      return false;
    }
    
    if (!assignedAgentId) {
      console.log(`🤖 AI Service: No assigned agent - using AI fallback`);
      this.conversationHandlers.set(ticketId, 'ai');
      return true;
    }
    
    const isAgentAvailable = await this.isAgentAvailable(assignedAgentId);
    console.log(`🤖 AI Service: Agent ${assignedAgentId} available: ${isAgentAvailable}`);
    
    if (!isAgentAvailable) {
      console.log(`🤖 AI Service: Agent unavailable - using AI fallback`);
      this.conversationHandlers.set(ticketId, 'ai');
      return true;
    }
    
    // If ticket data is provided, check engagement directly
    if (ticketData) {
      const hasAgentEngaged = this.checkAgentEngagement(ticketData, assignedAgentId);
      if (hasAgentEngaged) {
        console.log(`🤖 AI Service: Agent has engaged with ticket - no AI fallback`);
        this.conversationHandlers.set(ticketId, 'agent');
        return false;
      }
    }
    
    // Agent is available but hasn't engaged yet - let them have first chance
    console.log(`🤖 AI Service: Agent available but not engaged - no AI fallback (let agent respond)`);
    return false;
  }

  async generateHandoffMessage(ticketId: string, agentName?: string): Promise<string> {
    const agent = agentName || 'a support agent';
    return `👋 Great news! ${agent} has joined the conversation and will take over from here. They have access to our full conversation history and can provide you with more detailed assistance. Thank you for your patience!`;
  }

  async generateAgentWelcomeMessage(ticketId: string, agentName?: string): Promise<string> {
    const agent = agentName || 'Support agent';
    return `Hello! I'm ${agent} and I'll be assisting you from here. I can see our previous conversation and I'm ready to help resolve your issue. What can I do for you?`;
  }

  async shouldTriggerHandoff(ticketId: string, assignedAgentId: string): Promise<boolean> {
    // Check if agent just became available and there were recent AI responses
    const isAgentNowAvailable = await this.isAgentAvailable(assignedAgentId);
    
    if (isAgentNowAvailable) {
      console.log(`🤖 AI Service: Agent ${assignedAgentId} is now available for handoff`);
      this.conversationHandlers.set(ticketId, 'agent');
      return true;
    }
    
    return false;
  }

  setConversationHandler(ticketId: string, handler: 'ai' | 'agent'): void {
    console.log(`🤖 AI Service: Setting conversation handler for ticket ${ticketId} to ${handler}`);
    this.conversationHandlers.set(ticketId, handler);
  }

  getConversationHandler(ticketId: string): 'ai' | 'agent' | undefined {
    return this.conversationHandlers.get(ticketId);
  }

  clearConversationHandler(ticketId: string): void {
    this.conversationHandlers.delete(ticketId);
  }

  private checkAgentEngagement(ticket: any, agentId: string): boolean {
    try {
      // Check if ticket status is IN_PROGRESS (indicates agent engagement)
      if (ticket.status === 'IN_PROGRESS') {
        console.log(`🤖 Ticket ${ticket._id} is IN_PROGRESS - agent has engaged`);
        return true;
      }
      
      // Check if agent has sent any messages in this ticket
      const agentMessages = ticket.messages?.filter(msg => msg.sender === agentId);
      if (agentMessages && agentMessages.length > 0) {
        console.log(`🤖 Agent ${agentId} has sent ${agentMessages.length} messages in ticket ${ticket._id}`);
        return true;
      }
      
      // Check for recent agent activity (within last 10 minutes)
      if (ticket.lastAgentActivity) {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        if (ticket.lastAgentActivity > tenMinutesAgo) {
          console.log(`🤖 Recent agent activity detected for ticket ${ticket._id}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking agent engagement:', error);
      return false;
    }
  }
}
