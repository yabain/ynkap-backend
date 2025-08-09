import { Controller, Get, Param, Req, UseInterceptors } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { KeycloakApiService } from "../../keycloak/keycloak-api.service";
import { TransformResponeInterceptor } from "src/shared/interceptors/transform-response.interceptor";
import { CustomMessage } from "src/shared/decorators/custom-message.decorator";

@Controller('/users')
@UseInterceptors(TransformResponeInterceptor)
@ApiTags('Users')
export class UserController {

    constructor(private keycloakApiService: KeycloakApiService) {}

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
}