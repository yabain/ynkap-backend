import { Controller, Post, UseGuards, Req, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBasicAuth, ApiHeader } from '@nestjs/swagger';
import { AuthBasicGuard } from '../guards/auth-basic.guard';
import { AuthJwtGuard } from '../guards/auth-jwt.guard';
import { ApplicationAuthService } from '../services/application-auth.service';
//import { Public } from 'src/keycloak/keycloak.decorator';
import { Public } from 'nest-keycloak-connect';

@ApiTags('Application Authentication')
@Controller('application-auth')
export class ApplicationAuthController {
    constructor(private readonly applicationAuthService: ApplicationAuthService) {}

    @Public()
    @UseGuards(AuthBasicGuard)
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiBasicAuth('basic')
    @ApiOperation({ 
        summary: 'Authenticate application and get JWT token',
        description: `
        Authenticate your application using Basic Authentication to obtain a JWT token by Mejest Ulrich.
        
        **Authentication Method:** Basic Auth
        - Username: Your Client ID
        - Password: Your Private Key
        
        **Example:**
        \`\`\`bash
        curl -X POST https://api.y-nkap.com/application-auth/login \\
        -H "Authorization: Basic $(echo -n 'your-client-id:your-private-key' | base64)"
        \`\`\`
        `
    })
    @ApiHeader({
        name: 'Authorization',
        description: 'Basic authentication header with base64 encoded clientId:privateKey',
        required: true,
        example: 'Basic Y2xpZW50SWQ6cHJpdmF0ZUtleQ=='
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Authentication successful - JWT token generated',
        schema: {
            type: 'object',
            properties: {
                access_token: { 
                    type: 'string', 
                    description: 'JWT access token',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                },
                token_type: { 
                    type: 'string', 
                    example: 'Bearer',
                    description: 'Token type for Authorization header'
                },
                expires_in: { 
                    type: 'number', 
                    example: 3600,
                    description: 'Token expiration time in seconds'
                },
                environment: { 
                    type: 'string', 
                    enum: ['test', 'prod'],
                    description: 'Application environment'
                },
                permissions: { 
                    type: 'object',
                    description: 'Application permissions',
                    example: {
                        payments: true,
                        wallet: true,
                        messages: true
                    }
                },
                issued_at: { 
                    type: 'string', 
                    format: 'date-time',
                    description: 'Token issuance timestamp'
                }
            }
        }
    })
    @ApiResponse({ 
        status: 401, 
        description: 'Authentication failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 401 },
                error: { type: 'string', example: 'Unauthorized' },
                message: { type: 'string', example: 'Invalid client credentials' },
                timestamp: { type: 'string', format: 'date-time' }
            }
        }
    })
    @ApiResponse({ 
        status: 400, 
        description: 'Bad request - Missing or invalid credentials format',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                error: { type: 'string', example: 'Bad Request' },
                message: { type: 'string', example: 'Basic authentication required' }
            }
        }
    })
    async login(@Req() req) {
        const validationResult = {
            application: req.user.application,
            applicationKey: req.user.applicationKey,
            environment: req.user.environment
        };

        return await this.applicationAuthService.login(validationResult);
    }

    @UseGuards(AuthJwtGuard)
    @Get('verify')
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'Verify JWT token validity',
        description: `
        Verify if your JWT token is valid and get token information.
        
        **Authentication Method:** Bearer Token
        
        **Example:**
        \`\`\`bash
        curl -X GET https://api.y-nkap.com/application-auth/verify \\
          -H "Authorization: Bearer your-jwt-token"
        \`\`\`
        `
    })
    @ApiHeader({
        name: 'Authorization',
        description: 'Bearer token obtained from login endpoint',
        required: true,
        example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Token is valid - Returns token information',
        schema: {
            type: 'object',
            properties: {
                valid: { 
                    type: 'boolean', 
                    example: true,
                    description: 'Token validity status'
                },
                clientId: { 
                    type: 'string',
                    description: 'Application client ID',
                    example: 'app_12345'
                },
                appId: { 
                    type: 'string',
                    description: 'Application internal ID',
                    example: '507f1f77bcf86cd799439011'
                },
                environment: { 
                    type: 'string',
                    enum: ['test', 'prod'],
                    description: 'Application environment'
                },
                permissions: { 
                    type: 'object',
                    description: 'Application permissions',
                    example: {
                        payments: true,
                        wallet: true,
                        messages: true
                    }
                },
                expiresAt: { 
                    type: 'string', 
                    format: 'date-time',
                    description: 'Token expiration timestamp'
                }
            }
        }
    })
    @ApiResponse({ 
        status: 401, 
        description: 'Token is invalid or expired',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 401 },
                error: { type: 'string', example: 'Authentication error' },
                message: { 
                    type: 'array',
                    items: { type: 'string' },
                    example: ['Token has expired']
                },
                timestamp: { type: 'string', format: 'date-time' }
            }
        }
    })
    async verifyToken(@Req() req) {
        const user = req.user;
        
        return {
            valid: true,
            clientId: user.clientId,
            appId: user.appId,
            environment: user.environment,
            permissions: user.permissions,
            expiresAt: new Date(user.exp * 1000).toISOString()
        };
    }

    @UseGuards(AuthJwtGuard)
    @Post('refresh')
    @ApiBearerAuth()
    @ApiOperation({ 
        summary: 'Refresh JWT token',
        description: `
        Refresh your JWT token to extend its validity period.
        
        **Authentication Method:** Bearer Token
        
        **Example:**
        \`\`\`bash
        curl -X POST https://api.y-nkap.com/application-auth/refresh \\
          -H "Authorization: Bearer your-current-jwt-token"
        \`\`\`
        
        **Note:** The old token will remain valid until its original expiration time.
        `
    })
    @ApiHeader({
        name: 'Authorization',
        description: 'Bearer token to refresh',
        required: true,
        example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Token refreshed successfully',
        schema: {
            type: 'object',
            properties: {
                access_token: { 
                    type: 'string',
                    description: 'New JWT access token',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                },
                token_type: { 
                    type: 'string', 
                    example: 'Bearer',
                    description: 'Token type for Authorization header'
                },
                expires_in: { 
                    type: 'number', 
                    example: 3600,
                    description: 'New token expiration time in seconds'
                },
                environment: { 
                    type: 'string',
                    enum: ['test', 'prod'],
                    description: 'Application environment'
                },
                refreshed_at: { 
                    type: 'string', 
                    format: 'date-time',
                    description: 'Token refresh timestamp'
                }
            }
        }
    })
    @ApiResponse({ 
        status: 401, 
        description: 'Token is invalid or expired',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 401 },
                error: { type: 'string', example: 'Authentication error' },
                message: { 
                    type: 'array',
                    items: { type: 'string' },
                    example: ['Token has expired']
                }
            }
        }
    })
    async refreshToken(@Req() req) {
        const payload = {
            clientId: req.user.clientId,
            appId: req.user.appId,
            sub: req.user.sub,
            name: req.user.name,
            environment: req.user.environment,
            permissions: req.user.permissions,
            keyId: req.user.keyId
        };

        return await this.applicationAuthService.refreshToken(payload);
    }
}
