import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Req, UseInterceptors } from "@nestjs/common";
import { ApplicationService } from "../services/application.services";
import { CreateApplicationDTO } from "../dtos/create-application.dtos";
import { ObjectIDValidationPipe } from "src/shared/pipes/objectID.pipe";
import { UpdateApplicationDTO } from "../dtos/update-application.dtos";
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { TransformResponeInterceptor } from "src/shared/interceptors/transform-response.interceptor";
import { CustomMessage } from "src/shared/decorators/custom-message.decorator";
import { Request } from "express"


@Controller('applications')
@UseInterceptors(TransformResponeInterceptor)
@ApiTags('Applications')
export class ApplicationController {
    constructor(private applicationService: ApplicationService){}

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
        return await this.applicationService.createApplication(createApplicationDto, req);  
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
        return await this.applicationService.getAllApplications(req);
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
} 
