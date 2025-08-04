import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { lastValueFrom } from "rxjs";

@Injectable()
export class TicketAssignmentService {
    private assignmentToken: string | null = null;
    private tokenExpiresAt: number = 0;

    constructor(
        private http: HttpService,
        private configService: ConfigService
    ) {}

    /**
     * Get access token for the ticket assignment service using client credentials
     * This uses the backend client's service account
     */
    private async getAssignmentToken(): Promise<string> {
        const now = Math.floor(Date.now() / 1000);
        if (this.assignmentToken && this.tokenExpiresAt > now + 60) {
            return this.assignmentToken;
        }

        const tokenUrl = `${this.configService.get<string>('KEYCLOAK_SERVER_URI')}/realms/${this.configService.get<string>('KEYCLOAK_SERVER_REALM')}/protocol/openid-connect/token`;
        const clientId = this.configService.get<string>('TICKET_ASSIGNMENT_CLIENT_ID');
        const clientSecret = this.configService.get<string>('TICKET_ASSIGNMENT_CLIENT_SECRET');
        
        // Debug log to verify configuration
        console.log('Ticket Assignment Config:', {
            clientId,
            clientSecret: clientSecret ? '***' : 'undefined',
            tokenUrl
        });
        
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);

        try {
            const response = await lastValueFrom(
                this.http.post(tokenUrl, params, {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    timeout: 10000, // 10 second timeout
                    maxRedirects: 5
                })
            );
            
            this.assignmentToken = response.data.access_token;
            this.tokenExpiresAt = now + response.data.expires_in;
            return this.assignmentToken;
        } catch (error) {
            console.error('Failed to get assignment token:', error);
            
            // Log more details for debugging
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            } else if (error.request) {
                console.error('Network error - no response received');
            } else {
                console.error('Error message:', error.message);
            }
            
            throw new Error('Failed to authenticate ticket assignment service');
        }
    }

    /**
     * Get users by role using the assignment account token
     * @param roleName The role to search for
     * @returns Array of user IDs with the specified role
     */
    async getUsersByRole(roleName: string): Promise<string[]> {
        try {
            const token = await this.getAssignmentToken();
            const url = `${this.configService.get<string>('KEYCLOAK_SERVER_URI')}/admin/realms/${this.configService.get<string>('KEYCLOAK_SERVER_REALM')}/clients/${this.configService.get<string>('KEYCLOAK_CLIENT_UUID')}/roles/${roleName}/users`;
            
            const response = await lastValueFrom(
                this.http.get(url, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            );
            
            return response.data.map((user: any) => user.id);
        } catch (error) {
            console.error(`Failed to get users by role ${roleName}:`, error);
            throw new Error(`Failed to fetch users with role ${roleName}`);
        }
    }

    /**
     * Get a user's roles using the assignment account token
     * @param userId The user ID to check
     * @returns User's role mappings
     */
    async getUserRoles(userId: string): Promise<any> {
        try {
            const token = await this.getAssignmentToken();
            const url = `${this.configService.get<string>('KEYCLOAK_SERVER_URI')}/admin/realms/${this.configService.get<string>('KEYCLOAK_SERVER_REALM')}/users/${userId}/role-mappings`;
            
            const response = await lastValueFrom(
                this.http.get(url, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            );
            
            return response.data;
        } catch (error) {
            console.error(`Failed to get roles for user ${userId}:`, error);
            throw new Error(`Failed to fetch roles for user ${userId}`);
        }
    }

    /**
     * Verify if a user has a specific role
     * @param userId The user ID to check
     * @param roleName The role to verify
     * @returns true if user has the role, false otherwise
     */
    async hasRole(userId: string, roleName: string): Promise<boolean> {
        try {
            const userRoles = await this.getUserRoles(userId);
            const realmRoles = userRoles.realmMappings?.map((r: any) => r.name) || [];
            return realmRoles.includes(roleName);
        } catch (error) {
            console.error(`Failed to verify role ${roleName} for user ${userId}:`, error);
            return false;
        }
    }

    /**
     * Get available agents for a specific ticket type
     * @param ticketType The type of ticket (BUG, TRANSACTION, OTHERS)
     * @returns Array of user IDs that can handle this ticket type
     */
    async getAvailableAgents(ticketType: string): Promise<string[]> {
        const roleMapping = {
            'BUG': 'bugs-solver',
            'TRANSACTION': 'transactions-solver',
            'OTHERS': 'other-problems-solver'
        };

        const requiredRole = roleMapping[ticketType as keyof typeof roleMapping];
        if (!requiredRole) {
            throw new Error(`Invalid ticket type: ${ticketType}`);
        }

        try {
            // Get all users with the required role
            const candidateUsers = await this.getUsersByRole(requiredRole);
            
            // Filter users to ensure they actually have the role
            const verifiedUsers: string[] = [];
            for (const userId of candidateUsers) {
                if (await this.hasRole(userId, requiredRole)) {
                    verifiedUsers.push(userId);
                }
            }

            return verifiedUsers;
        } catch (error) {
            console.error(`Failed to get available agents for ticket type ${ticketType}:`, error);
            throw new Error(`Failed to fetch available agents for ${ticketType} tickets`);
        }
    }

    /**
     * Select a random agent from the available agents
     * @param ticketType The type of ticket
     * @returns Selected user ID or null if no agents available
     */
    async selectRandomAgent(ticketType: string): Promise<string | null> {
        try {
            const availableAgents = await this.getAvailableAgents(ticketType);
            
            if (availableAgents.length === 0) {
                return null;
            }

            // Select a random agent
            const randomIndex = Math.floor(Math.random() * availableAgents.length);
            return availableAgents[randomIndex];
        } catch (error) {
            console.error(`Failed to select random agent for ticket type ${ticketType}:`, error);
            throw new Error(`Failed to select agent for ${ticketType} ticket`);
        }
    }

    /**
     * Get user details by user ID using the assignment account token
     * @param userId The user ID to get details for
     * @returns User details with email and name
     */
    async getUserById(userId: string): Promise<{ email: string; name: string } | null> {
        try {
            const token = await this.getAssignmentToken();
            const url = `${this.configService.get<string>('KEYCLOAK_SERVER_URI')}/admin/realms/${this.configService.get<string>('KEYCLOAK_SERVER_REALM')}/users/${userId}`;
            
            const response = await lastValueFrom(
                this.http.get(url, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            );
            
            const user = response.data;
            return {
                email: user.email || '',
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || ''
            };
        } catch (error) {
            console.error(`Failed to get user details for ${userId}:`, error);
            return null;
        }
    }
} 