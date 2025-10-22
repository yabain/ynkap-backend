import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../models/user.schema';

@Injectable()
export class AgentAvailabilityService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>
    ) {}

    /**
     * Check if any agents are available for new tickets
     * @param ticketType Type of ticket to find agents for
     * @returns true if agents are available
     */
    async areAgentsAvailable(ticketType?: string): Promise<boolean> {
        console.log(`🔍 Checking if any agents are available`);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        const availableAgents = await this.userModel.countDocuments({
            status: { $in: ['online', 'away'] },
            isAvailableForTickets: true,
            lastActive: { $gte: fiveMinutesAgo },
            activeTicketsCount: { $lt: 10 } // Max 10 active tickets per agent
        });
        
        console.log(`🔍 Available agents count: ${availableAgents}`);
        return availableAgents > 0;
    }

    /**
     * Check if a specific agent is available
     * @param agentId Agent user ID
     * @returns true if agent is available
     */
    async isAgentAvailable(agentId: string): Promise<boolean> {
        console.log(`🔍 Checking availability for agent: ${agentId}`);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        // First check if agent exists at all
        const agentRecord = await this.userModel.findOne({ sub: agentId });
        console.log(`🔍 Agent record found:`, agentRecord ? {
            sub: agentRecord.sub,
            status: agentRecord.status,
            isAvailableForTickets: agentRecord.isAvailableForTickets,
            lastActive: agentRecord.lastActive
        } : 'NO RECORD');
        
        const agent = await this.userModel.findOne({
            sub: agentId,
            status: { $in: ['online', 'away'] },
            isAvailableForTickets: true,
            lastActive: { $gte: fiveMinutesAgo }
        });
        
        console.log(`🔍 Agent availability result: ${!!agent}`);
        return !!agent;
    }

    /**
     * Update agent status
     * @param agentId Agent user ID
     * @param status New status
     * @param isAvailable Whether agent is available for tickets
     */
    async updateAgentStatus(agentId: string, status: 'online' | 'offline' | 'busy' | 'away', isAvailable: boolean = true): Promise<void> {
        await this.userModel.updateOne(
            { sub: agentId },
            {
                $set: {
                    status,
                    isAvailableForTickets: isAvailable,
                    lastActive: new Date()
                }
            },
            { upsert: true }
        );
    }

    /**
     * Get all available agents
     * @returns List of available agents
     */
    async getAvailableAgents(): Promise<UserDocument[]> {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        return this.userModel.find({
            status: { $in: ['online', 'away'] },
            isAvailableForTickets: true,
            lastActive: { $gte: fiveMinutesAgo },
            activeTicketsCount: { $lt: 10 }
        }).exec();
    }

    /**
     * Increment active tickets count for an agent
     * @param agentId Agent user ID
     */
    async incrementActiveTickets(agentId: string): Promise<void> {
        await this.userModel.updateOne(
            { sub: agentId },
            { $inc: { activeTicketsCount: 1 } }
        );
    }

    /**
     * Decrement active tickets count for an agent
     * @param agentId Agent user ID
     */
    async decrementActiveTickets(agentId: string): Promise<void> {
        await this.userModel.updateOne(
            { sub: agentId },
            { $inc: { activeTicketsCount: -1 } }
        );
    }
}