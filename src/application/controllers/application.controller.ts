import { 
    Controller, 
    Get, 
    Post, 
    Body, 
    Patch, 
    Param, 
    Delete, 
    Put,
    Query,
    HttpStatus, 
    Req,
    UseInterceptors,
    BadRequestException,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException,
    ForbiddenException
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { ApplicationService } from '../services/application.services';
import { CreateApplicationDTO } from "../dtos/create-application.dtos";
import { ObjectIDValidationPipe } from "src/shared/pipes/objectID.pipe";
import { UpdateApplicationDTO } from "../dtos/update-application.dtos";
import { TransformResponeInterceptor } from "src/shared/interceptors/transform-response.interceptor";
import { CustomMessage } from "src/shared/decorators/custom-message.decorator";
import { Request } from "express";
import { KeyAuditService } from '../services/key-audit.service';
import { AuditEventType } from '../models/key-audit.schema';
import { KeyRotationService } from '../services/key-rotation.service';

@Controller('applications')
@ApiTags('Applications')
@UseInterceptors(TransformResponeInterceptor)
export class ApplicationController {
    constructor(
        private readonly applicationService: ApplicationService,
        private readonly keyAuditService: KeyAuditService,
        private readonly keyRotationService: KeyRotationService
    ) {}

    @Post()
    @CustomMessage('Application successfully created')
    @ApiOperation({
        summary: "Create a new application",
        description: "This method creates a new application in the system"
    })
    @ApiResponse({status: HttpStatus.CREATED, description: "Application successfully created",})
    @ApiResponse({status: HttpStatus.CONFLICT, description: "Application with one of the body's property already exists"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occured"})

    async createApplication(@Body() createApplicationDto: CreateApplicationDTO, @Req() req) {
        console.log('Requête de création d\'application reçue:', createApplicationDto);
        console.log('Informations utilisateur:', req.user);
        
        try {
            const result = await this.applicationService.createApplication(createApplicationDto, req);
            console.log('Application créée avec succès:', result);
            return result;
        } catch (error) {
            console.error('Erreur lors de la création de l\'application:', error);
            throw error;
        }
    }

    @Get()
    @CustomMessage('List of applications successfully retrieved')
    @ApiOperation({
        summary: "Get all applications of the connected user",
        description: "This method returns the list of applications created by the logged-in user"
    })
    @ApiResponse({status: HttpStatus.OK, description: "List of applications for the current user"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occured"})

    async getAllApplication(@Req() req: Request){
        console.log('Récupération de toutes les applications pour l\'utilisateur:', req['user'] ? req['user']['sub'] : 'non authentifié');
        
        // Vérifier si l'utilisateur est authentifié
        if (!req['user'] || !req['user']['sub']) {
            throw new UnauthorizedException('Utilisateur non authentifié ou ID utilisateur manquant');
        }
        
        try {
            const applications = await this.applicationService.getAllApplications(req);
            console.log(`${applications.length} applications trouvées`);
            return applications;
        } catch (error) {
            console.error('Erreur lors de la récupération des applications:', error);
            throw error;
        }
    }

    @Get(':id')
    @CustomMessage('Application successfully retrieved')
    @ApiOperation({
        summary: "Get one application by using his ID",
        description: "This method provides details of a specific application"
    })
    @ApiParam({ name: 'id', description: 'ID de l\'application', example: "66bf8a89203d5fab750c0f63"})
    @ApiResponse({status: HttpStatus.OK, description: "Application details"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "The application with the id passed in parameter cannot be found "})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occured"})
    
    async getApplicationById(@Param("id", ObjectIDValidationPipe) id:any, @Req() req: Request){
        return await this.applicationService.getApplicationById(id, req);
    }

    @Put(':id')
    @CustomMessage('Application successfully updated')
    @ApiOperation({
        summary: "update one application by using his ID",
        description: "This method updates the data in an existing application"
    })
    @ApiBody({ type: UpdateApplicationDTO })
    @ApiParam({ name: 'id', description: 'ID de l\'application', example: "66bf8a89203d5fab750c0f63"})
    @ApiResponse({status: HttpStatus.OK, description: "Application updates"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "The application with the id passed in parameter cannot be found "})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occured"})

    async updateApplicationById(@Param("id", ObjectIDValidationPipe) id:any, @Body() updateApplicationDtos: UpdateApplicationDTO){
        return await this.applicationService.updateApplicationById(id, updateApplicationDtos);
    }

    @Delete(':id')
    @CustomMessage('Application successfully deleted')
    @ApiOperation({
        summary: "delete one application by using his ID",
        description: "This method deletes an application and the wallet attached to it"
    })
    @ApiParam({ name: 'id', description: 'ID de l\'application', example: "66bf8a89203d5fab750c0f63"})
    @ApiResponse({status: HttpStatus.OK, description: "Application successfully deleted"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "The application with the ID passed in parameter cannot be found"})
    @ApiResponse({status: HttpStatus.BAD_REQUEST, description: "The wallet associated with this application still has funds"})
    @ApiResponse({status: HttpStatus.FORBIDDEN, description: "You do not have permission to delete this application"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occurred"})

    async deleteApplicationById(@Param("id", ObjectIDValidationPipe) id: string, @Req() req: Request) {
        // Vérifier si l'application appartient à l'utilisateur actuel
        const app = await this.applicationService.findById(id, null); // Passer null comme session
        
        if (!app) {
            throw new NotFoundException(`The application with the ID ${id} cannot be found`);
        }
        
        // Vérifier que l'utilisateur est le propriétaire de l'application
        if (app.user !== req['user']['sub']) {
            throw new ForbiddenException('You do not have permission to delete this application');
        }
        
        return await this.applicationService.deleteApplication(id);
    }

    @Post(':id/regenerate-keys')
    @ApiOperation({ summary: 'Regenerate API keys for an application' })
    @ApiParam({ name: 'id', description: 'Application ID' })
    @ApiBody({ 
        schema: { 
            type: 'object', 
            properties: { 
                environment: { 
                    type: 'string', 
                    enum: ['test', 'prod'],
                    description: 'Environment for which to regenerate keys'
                }
            },
            required: ['environment']
        }
    })
    @ApiResponse({status: HttpStatus.OK, description: "Keys regenerated successfully"})
    @ApiResponse({status: HttpStatus.BAD_REQUEST, description: "Invalid environment or request"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "Application not found"})
    @ApiResponse({status: HttpStatus.FORBIDDEN, description: "User does not have permission to regenerate keys"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    async regenerateKeys(
        @Param('id', ObjectIDValidationPipe) id: string,
        @Body() body: { environment: 'prod' | 'test' },
        @Req() req
    ) {
        const { environment } = body;
        
        if (!environment || !['test', 'prod'].includes(environment)) {
            throw new BadRequestException('Environment must be either "test" or "prod"');
        }
        
        try {
            const result = await this.applicationService.regenerateKeys(id, environment, req);
            
            return {
                success: true,
                message: `${environment} keys regenerated successfully`,
                data: {
                    applicationId: id,
                    environment,
                    clientId: environment === 'prod' ? result.clientIdProd : result.clientIdTest,
                    // Ne pas exposer la clé privée dans la réponse pour des raisons de sécurité
                    keyGenerated: true,
                    generatedAt: new Date().toISOString()
                }
            };
        } catch (error) {
            throw new InternalServerErrorException(`Failed to regenerate ${environment} keys: ${error.message}`);
        }
    }

    @Get(':id/credentials')
    @ApiOperation({ summary: 'Get application credentials' })
    @ApiParam({ name: 'id', description: 'Application ID' })
    @ApiResponse({status: HttpStatus.OK, description: "Credentials retrieved successfully"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "Application not found"})
    @ApiResponse({status: HttpStatus.FORBIDDEN, description: "User does not have permission to view credentials"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    async getCredentials(@Param('id') id: string, @Req() req) {
        const app = await this.applicationService.findById(id, null);
        
        if (!app) {
            throw new NotFoundException(`Application with ID ${id} not found`);
        }
        
        // Vérifier que l'utilisateur est le propriétaire de l'application
        if (app.user !== req['user']['sub']) {
            throw new ForbiddenException('You do not have permission to view credentials for this application');
        }
        
        return {
            production: {
                clientId: app.clientIdProd,
                privateKey: app.privateKeyProd,
                active: app.envProd
            },
            test: {
                clientId: app.clientIdTest,
                privateKey: app.privateKeyTest, 
                active: app.envTest
            }
        };
    }

    @Get(':id/keys/audit')
    @ApiOperation({ summary: 'Récupérer l\'audit des clés d\'authentification' })
    @ApiParam({ name: 'id', description: 'ID de l\'application' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre de logs à récupérer (max 100)' })
    @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Nombre de logs à ignorer' })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Date de début (ISO)' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Date de fin (ISO)' })
    @ApiQuery({ name: 'eventType', required: false, enum: AuditEventType, description: 'Type d\'événement' })
    @ApiQuery({ name: 'environment', required: false, enum: ['test', 'prod'], description: 'Environnement' })
    @ApiResponse({ status: 200, description: 'Logs d\'audit récupérés avec succès' })
    @ApiResponse({ status: 403, description: 'Accès refusé' })
    @ApiResponse({ status: 404, description: 'Application non trouvée' })
    async getKeysAudit(
        @Param('id', ObjectIDValidationPipe) id: string,
        @Req() req,
        @Query('limit') limit?: number,
        @Query('skip') skip?: number,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('eventType') eventType?: AuditEventType,
        @Query('environment') environment?: 'test' | 'prod'
    ) {
        // Vérifier que l'application existe et appartient à l'utilisateur
        const app = await this.applicationService.findById(id, null);
        if (!app) {
            throw new NotFoundException(`Application with ID ${id} not found`);
        }

        if (app.user !== req['user']['sub']) {
            throw new ForbiddenException('You do not have permission to view audit logs for this application');
        }

        // Valider et limiter les paramètres
        if (!limit || limit > 100) limit = 50;
        if (!skip || skip < 0) skip = 0;

        const options: any = { limit, skip };

        if (startDate) options.startDate = new Date(startDate);
        if (endDate) options.endDate = new Date(endDate);
        if (eventType) options.eventType = eventType;
        if (environment) options.environment = environment;

        const { logs, total } = await this.keyAuditService.getAuditLogs(id, options);
        const stats = await this.keyAuditService.getAuditStats(id);

        return {
            data: logs,
            total,
            limit,
            skip,
            stats: {
                totalAttempts: stats.totalAttempts,
                successfulLogins: stats.events.filter(e => e.eventType === 'LOGIN_SUCCESS').reduce((sum, e) => sum + e.count, 0),
                failedLogins: stats.events.filter(e => e.eventType === 'LOGIN_FAILED').reduce((sum, e) => sum + e.count, 0),
                keyRegenerations: stats.events.filter(e => e.eventType === 'KEY_REGENERATED').reduce((sum, e) => sum + e.count, 0)
            }
        };
    }

    @Get(':id/keys/audit/stats')
    @ApiOperation({ summary: 'Statistiques d\'audit des clés' })
    @ApiParam({ name: 'id', description: 'ID de l\'application' })
    @ApiQuery({ name: 'days', required: false, type: Number, description: 'Nombre de jours (défaut: 30)' })
    async getKeysAuditStats(
        @Param('id', ObjectIDValidationPipe) id: string,
        @Req() req,
        @Query('days') days?: number
    ) {
        const app = await this.applicationService.findById(id, null);
        if (!app) {
            throw new NotFoundException(`Application with ID ${id} not found`);
        }

        if (app.user !== req['user']['sub']) {
            throw new ForbiddenException('You do not have permission to view audit stats for this application');
        }

        const stats = await this.keyAuditService.getAuditStats(id, days || 30);
        
        return {
            period: `${days || 30} derniers jours`,
            ...stats
        };
    }

    @Post(':id/keys/rotate')
    @ApiOperation({ summary: 'Effectuer une rotation des clés API' })
    @ApiParam({ name: 'id', description: 'ID de l\'application' })
    @ApiBody({
      schema: {
        type: 'object',
        properties: {
          environment: {
            type: 'string',
            enum: ['test', 'prod'],
            description: 'Environnement pour lequel effectuer la rotation'
          },
          gracePeriodHours: {
            type: 'number',
            minimum: 1,
            maximum: 168,
            default: 24,
            description: 'Période de grâce en heures (1-168h, défaut: 24h)'
          }
        },
        required: ['environment']
      }
    })
    @ApiResponse({ status: 200, description: 'Rotation effectuée avec succès' })
    @ApiResponse({ status: 400, description: 'Paramètres invalides' })
    @ApiResponse({ status: 403, description: 'Accès refusé' })
    @ApiResponse({ status: 404, description: 'Application non trouvée' })
    async rotateKeys(
      @Param('id', ObjectIDValidationPipe) id: string,
      @Body() body: { 
        environment: 'test' | 'prod';
        gracePeriodHours?: number;
      },
      @Req() req
    ) {
      const { environment, gracePeriodHours = 24 } = body;

      if (!environment || !['test', 'prod'].includes(environment)) {
        throw new BadRequestException('Environment must be either "test" or "prod"');
      }

      if (gracePeriodHours < 1 || gracePeriodHours > 168) {
        throw new BadRequestException('Grace period must be between 1 and 168 hours');
      }

      // Vérifier que l'application appartient à l'utilisateur
      const app = await this.applicationService.findById(id, null);
      if (!app) {
        throw new NotFoundException(`Application with ID ${id} not found`);
      }

      if (app.user !== req['user']['sub']) {
        throw new ForbiddenException('You do not have permission to rotate keys for this application');
      }

      try {
        const result = await this.keyRotationService.rotateKeys(id, environment, gracePeriodHours, req);

        return {
          success: true,
          message: `${environment} keys rotated successfully`,
          data: {
            applicationId: id,
            environment,
            newKeys: {
              clientId: result.newKeys.clientId,
              // Ne pas exposer la clé privée dans la réponse
              keyGenerated: true
            },
            previousKeys: {
              clientId: result.previousKeys.clientId,
              stillActive: true,
              deactivatesAt: result.gracePeriodEnds
            },
            gracePeriod: {
              hours: gracePeriodHours,
              endsAt: result.gracePeriodEnds
            },
            rotatedAt: new Date().toISOString()
          }
        };
      } catch (error) {
        throw new InternalServerErrorException(`Failed to rotate ${environment} keys: ${error.message}`);
      }
    }

    @Delete(':id/keys/previous')
    @ApiOperation({ summary: 'Désactiver manuellement les anciennes clés' })
    @ApiParam({ name: 'id', description: 'ID de l\'application' })
    @ApiBody({
      schema: {
        type: 'object',
        properties: {
          environment: {
            type: 'string',
            enum: ['test', 'prod'],
            description: 'Environnement pour lequel désactiver les anciennes clés'
          }
        },
        required: ['environment']
      }
    })
    async deactivatePreviousKeys(
      @Param('id', ObjectIDValidationPipe) id: string,
      @Body() body: { environment: 'test' | 'prod' },
      @Req() req
    ) {
      const { environment } = body;

      // Vérifications de sécurité
      const app = await this.applicationService.findById(id, null);
      if (!app) {
        throw new NotFoundException(`Application with ID ${id} not found`);
      }

      if (app.user !== req['user']['sub']) {
        throw new ForbiddenException('You do not have permission to manage keys for this application');
      }

      await this.keyRotationService.deactivatePreviousKeys(id, environment);

      return {
        success: true,
        message: `Previous ${environment} keys deactivated successfully`,
        data: {
          applicationId: id,
          environment,
          deactivatedAt: new Date().toISOString()
        }
      };
    }

    @Get(':id/keys/rotation-status')
    @ApiOperation({ summary: 'Obtenir le statut de rotation des clés' })
    @ApiParam({ name: 'id', description: 'ID de l\'application' })
    async getKeyRotationStatus(
      @Param('id', ObjectIDValidationPipe) id: string,
      @Req() req
    ) {
      const app = await this.applicationService.findById(id, null);
      if (!app) {
        throw new NotFoundException(`Application with ID ${id} not found`);
      }

      if (app.user !== req['user']['sub']) {
        throw new ForbiddenException('You do not have permission to view rotation status for this application');
      }

      const status = await this.keyRotationService.getKeyRotationStatus(id);
      
      return {
        success: true,
        data: status
      };
    }
}
