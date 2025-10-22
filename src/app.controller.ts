import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthenticatedUser, Public } from 'nest-keycloak-connect';
import { EmailService } from './notifications/services/email.service';
import { RecaptchaService } from './shared/services/recaptcha.service';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config/dist/config.service';

@ApiTags('System Health')
@Controller('')
export class AppController {
  version = "1.0.0"
  constructor(
    private readonly appService: AppService,
    private configService: ConfigService,
    private emailService: EmailService,
    private recaptchaService: RecaptchaService
  ) {}

  @Get()
  @Public() 
  @ApiOperation({
    summary: 'Vérification de l\'état de l\'API Y-Nkap',
    description: `
    Cette route racine permet de vérifier que l'API Y-Nkap fonctionne correctement.
    Elle est utilisée pour le monitoring de santé et la vérification de connectivité.
    
    **Fonctionnalités :**
    - Vérification de l'état opérationnel de l'API
    - Retour de la version actuelle du service
    - Endpoint de monitoring pour les outils de surveillance
    - Test de connectivité rapide sans authentification
    
    **Utilisation typique :**
    - Health checks automatisés
    - Monitoring de production
    - Tests de connectivité
    - Vérification de déploiement
    
    **Aucune authentification requise** - Endpoint public pour faciliter le monitoring
    `
  })
  @ApiResponse({
    status: HttpStatus.OK, 
    description: 'API opérationnelle - Version et statut retournés',
    schema: {
      type: 'string',
      example: 'Y-Nkap Payment API v2.1.0 - Service operational',
      description: 'Message confirmant le bon fonctionnement de l\'API avec sa version'
    }
  })
  @ApiResponse({ 
    status: HttpStatus.SERVICE_UNAVAILABLE, 
    description: 'Service temporairement indisponible',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 503 },
        message: { type: 'string', example: 'Service temporarily unavailable' },
        timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.439Z' }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Erreur interne du serveur',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Internal server error' },
        timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.439Z' }
      }
    }
  })
  getMainRoad(): string {
    return this.appService.getVersion();
  }

    // @Get()
    // @Public() 
    // @ApiResponse({status: HttpStatus.OK, description: "The route displaying the application version"})
    // @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    // getMainRoad(): string {
    //   return `Y-Nkap API Version ${this.configService.get<string>("NODE_ENV")} ${this.version}`;
    // }

    @Get('recaptcha/site-key')
    @Public()
    @ApiResponse({status: HttpStatus.OK, description: "Get reCAPTCHA site key"})
    getRecaptchaSiteKey(): { siteKey: string } {
      return { siteKey: this.recaptchaService.getSiteKey() };
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
  
