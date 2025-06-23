import { Body, Controller, Delete, ForbiddenException, Get, HttpStatus, NotFoundException, Param, Post, Put, Req, UnauthorizedException, UseInterceptors } from "@nestjs/common";
import { ApplicationService } from "../services/application.services";
import { CreateApplicationDTO } from "../dtos/create-application.dtos";
import { ObjectIDValidationPipe } from "src/shared/pipes/objectID.pipe";
import { UpdateApplicationDTO } from "../dtos/update-application.dtos";
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { TransformResponeInterceptor } from "src/shared/interceptors/transform-response.interceptor";
import { CustomMessage } from "src/shared/decorators/custom-message.decorator";
import { Request } from "express";

@Controller('applications')
@ApiTags('Applications')
@UseInterceptors(TransformResponeInterceptor)
export class ApplicationController {
    constructor(private readonly applicationService: ApplicationService) {}

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
    @ApiResponse({status: HttpStatus.OK, description: "Application successfuly deleted"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "The application with the id passed in parameter cannot be found "})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occured"})
    
    async deleteApplicationById(@Param("id", ObjectIDValidationPipe) id:any){
        await this.applicationService.deleteApplication(id);
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
                    enum: ['prod', 'test'],
                    description: 'Environment for which to regenerate keys'
                }
            },
            required: ['environment']
        }
    })
    @ApiResponse({status: HttpStatus.OK, description: "Keys regenerated successfully"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "Application not found"})
    @ApiResponse({status: HttpStatus.FORBIDDEN, description: "User does not have permission to regenerate keys"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    async regenerateKeys(
        @Param('id') id: string,
        @Body('environment') environment: 'prod' | 'test',
        @Req() req
    ) {
        return await this.applicationService.regenerateKeys(id, environment, req);
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
                privateKey: app.privateKeytest,
                active: app.envTest
            }
        };
    }
}
