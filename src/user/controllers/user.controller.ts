import { Controller, Get, Param, Req, UseInterceptors, Put, Body } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { KeycloakApiService } from "../../keycloak/keycloak-api.service";
import { TransformResponeInterceptor } from "src/shared/interceptors/transform-response.interceptor";
import { CustomMessage } from "src/shared/decorators/custom-message.decorator";
import { AgentAvailabilityService } from "../services/agent-availability.service";
import { ChatGateway } from "../../chat-gateway/gateways/chat.gateway";

@Controller('/users')
@UseInterceptors(TransformResponeInterceptor)
@ApiTags('Users')
export class UserController {

    constructor(
        private keycloakApiService: KeycloakApiService,
        private agentAvailabilityService: AgentAvailabilityService,
        private chatGateway: ChatGateway
    ) {}

    @Get(':id')
    @CustomMessage("User information retrieved successfully")
    @ApiOperation({
        summary: "Get user information by ID",
        description: "Retrieve user details from Keycloak by user ID"
    })
    @ApiResponse({status: 200, description: "User information retrieved successfully"})
    @ApiResponse({status: 404, description: "User not found"})
    @ApiResponse({status: 401, description: "Unauthorized"})
    async getUserById(@Param('id') userId: string, @Req() req: any) {
        try {
            const userDetails = await this.keycloakApiService.getUserById(userId);
            if (userDetails) {
                return {
                    _id: userId,
                    name: `${userDetails.firstName || ''} ${userDetails.lastName || ''}`.trim() || userDetails.username || 'Unknown User',
                    email: userDetails.email || '',
                    username: userDetails.username,
                    firstName: userDetails.firstName,
                    lastName: userDetails.lastName
                };
            }
            throw new Error('User not found');
        } catch (error) {
            console.error(`Failed to get user info for ${userId}:`, error);
            // Return fallback user info instead of throwing error
            return {
                _id: userId,
                name: `User (${userId.substring(0, 6)}...)`,
                email: '',
                username: '',
                firstName: '',
                lastName: ''
            };
        }
    }

    @Put('status')
    @CustomMessage("Agent status updated successfully")
    @ApiOperation({
        summary: "Update agent availability status",
        description: "Update the current user's availability status for ticket assignment"
    })
    @ApiResponse({status: 200, description: "Status updated successfully"})
    @ApiResponse({status: 401, description: "Unauthorized"})
    async updateAgentStatus(
        @Body() statusData: { status: 'online' | 'offline' | 'busy' | 'away', isAvailable?: boolean },
        @Req() req: any
    ) {
        const userId = req['user']['sub'];
        const wasAvailable = await this.agentAvailabilityService.isAgentAvailable(userId);
        
        await this.agentAvailabilityService.updateAgentStatus(
            userId, 
            statusData.status, 
            statusData.isAvailable ?? true
        );
        
        // If agent just came online, trigger handoff check
        const isNowAvailable = await this.agentAvailabilityService.isAgentAvailable(userId);
        if (!wasAvailable && isNowAvailable) {
            console.log(`👋 Agent ${userId} just came online, triggering handoff checks`);
            // Directly call the handoff handler
            await this.chatGateway.handleAgentOnline(null, { agentId: userId });
        }
        
        return { message: 'Status updated successfully' };
    }

    @Get('availability/status')
    @CustomMessage("Agent availability status retrieved successfully")
    @ApiOperation({
        summary: "Get current agent availability status",
        description: "Get the current user's availability status and general agent availability"
    })
    @ApiResponse({status: 200, description: "Availability status retrieved successfully"})
    async getAvailabilityStatus(@Req() req: any) {
        const userId = req['user']['sub'];
        const isCurrentUserAvailable = await this.agentAvailabilityService.isAgentAvailable(userId);
        const areAgentsAvailable = await this.agentAvailabilityService.areAgentsAvailable();
        const availableAgents = await this.agentAvailabilityService.getAvailableAgents();
        
        return {
            currentUserAvailable: isCurrentUserAvailable,
            anyAgentsAvailable: areAgentsAvailable,
            availableAgentsCount: availableAgents.length
        };
    }

    @Put('trigger-handoff')
    @CustomMessage("Handoff check triggered successfully")
    @ApiOperation({
        summary: "Manually trigger handoff check",
        description: "Manually trigger handoff checks for the current agent (for testing)"
    })
    @ApiResponse({status: 200, description: "Handoff check triggered successfully"})
    async triggerHandoff(@Req() req: any) {
        const userId = req['user']['sub'];
        console.log(`👋 Manual handoff trigger for agent ${userId}`);
        
        // Directly call the handoff handler
        await this.chatGateway.handleAgentOnline(null, { agentId: userId });
        
        return { message: 'Handoff check triggered successfully' };
    }

    @Put('force-online')
    @CustomMessage("Agent forced online successfully")
    @ApiOperation({
        summary: "Force agent online (for testing)",
        description: "Manually set the current agent as online for testing purposes"
    })
    @ApiResponse({status: 200, description: "Agent forced online successfully"})
    async forceAgentOnline(@Req() req: any) {
        const userId = req['user']['sub'];
        console.log(`👋 Forcing agent ${userId} online`);
        
        // Force update agent status in database
        await this.agentAvailabilityService.updateAgentStatus(userId, 'online', true);
        
        // Manually add agent to online set and trigger handoff
        this.chatGateway.onlineAgents.add(userId);
        await this.chatGateway.handleAgentOnline(null, { agentId: userId });
        
        return { 
            message: 'Agent forced online and handoff triggered',
            agentId: userId,
            onlineAgents: Array.from(this.chatGateway.onlineAgents)
        };
    }
}