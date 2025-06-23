import { Controller, Post, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthBasicGuard } from '../guards/auth-basic.guard';
import { ApplicationAuthService } from '../services/application-auth.service';
import { Public } from 'src/keycloak/keycloak.decorator';

@ApiTags('Application Authentication')
@Controller('application-auth')
export class ApplicationAuthController {
    constructor(private readonly applicationAuthService: ApplicationAuthService) {}

    @Public() // Marquer cette route comme publique pour éviter l'authentification Keycloak
    @UseGuards(AuthBasicGuard)
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Authenticate an application and get JWT token' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                username: {
                    type: 'string',
                    description: 'Client ID'
                },
                password: {
                    type: 'string',
                    description: 'Private Key'
                }
            },
            required: ['username', 'password']
        }
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Authentication successful',
        schema: {
            type: 'object',
            properties: {
                access_token: {
                    type: 'string',
                    description: 'JWT token'
                }
            }
        }
    })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid credentials' })
    async login(@Req() req) {
        return this.applicationAuthService.login(req.user);
    }
}
