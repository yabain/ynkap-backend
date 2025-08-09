import { Controller, Get, HttpStatus, Redirect, Request, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiResponse } from '@nestjs/swagger';
import { AuthenticatedUser, Public } from 'nest-keycloak-connect';
import { EmailService } from './notifications/services/email.service';

@Controller('')

export class AppController {

  version = "1.0.0"
  constructor(
    private configService: ConfigService,
    private emailService: EmailService
  ) {}
    @Get()
    @ApiResponse({status: HttpStatus.OK, description: "The route displaying the application version"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    getMainRoad(): string {
      return `Y-Nkap API Version ${this.configService.get<string>("NODE_ENV")} ${this.version}`;
    }

    // Email test endpoint - commented out after successful configuration
    // Uncomment if you need to test email configuration again
    /*
    @Get('test-email')
    @Public() // Make this endpoint public (no authentication required)
    @ApiResponse({status: HttpStatus.OK, description: "Test email configuration"})
    async testEmail(): Promise<{ success: boolean; message: string; details?: any }> {
      try {
        console.log('🧪 Starting email test...');
        const result = await this.emailService.testEmailConfiguration();
        console.log('🧪 Email test result:', result);

        return {
          success: result,
          message: result
            ? 'Email test successful! Check your inbox.'
            : 'Email test failed. Check server logs for details.',
          details: {
            smtpHost: this.configService.get('SMTP_HOST'),
            smtpPort: this.configService.get('SMTP_PORT'),
            smtpUser: this.configService.get('SMTP_USER') ? 'SET' : 'NOT SET',
            smtpPass: this.configService.get('SMTP_PASS') ? 'SET' : 'NOT SET',
            testEmail: this.configService.get('SMTP_TEST_EMAIL')
          }
        };
      } catch (error) {
        console.error('🧪 Email test error:', error);
        return {
          success: false,
          message: `Email test failed: ${error.message}`,
          details: {
            error: error.message,
            stack: error.stack
          }
        };
      }
    }
    */
}
  
