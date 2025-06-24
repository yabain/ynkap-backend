import { Body, Controller, Get, HttpStatus, Param, Post, Put, Req, UseInterceptors } from "@nestjs/common";
import { CreateTicketDTO } from "../dtos/create-ticket.dto";
import { TicketService } from "../services/ticket.services";
import { CustomMessage } from "src/shared/decorators/custom-message.decorator";
import { TransformResponeInterceptor } from "src/shared/interceptors/transform-response.interceptor";
import { ObjectIDValidationPipe } from "src/shared/pipes/objectID.pipe";
import { UpdateStatusTicketDTO } from "../dtos/update-status-ticket.dto";
import { TicketTypes } from "../enums/ticket-types.enum";
import { Request } from "express"

import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { LogActivity } from '../../logs/interceptors/activity-logger.interceptor';
import { LogType } from '../../logs/enums/log-type.enum';

@Controller('tickets')
@UseInterceptors(TransformResponeInterceptor)
@ApiTags('Tickets')
export class TicketController {
    constructor(private ticketService: TicketService){}

    @Post()
    @CustomMessage("Ticket créé avec succès")
    @ApiOperation({
        summary: "Create a new ticket",
        description: "this method creates a new ticket and assigns it to a member of the support team "
    })
    @ApiResponse({status: HttpStatus.CREATED, description: "Ticket successfully created",})
    @ApiResponse({status: HttpStatus.BAD_REQUEST, description: "A user with the role of manager has tried to create a ticket"})
    @ApiResponse({status: HttpStatus.BAD_REQUEST, description: "The ticket type does not match any of the variables in the ticket type enumeration list"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "There is no agent with the desired ticket role"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occured"})

    async createTicket(@Body() createTicketDtos: CreateTicketDTO, @Req() req: Request) {
        return await this.ticketService.createTicket(createTicketDtos,req)
    }

    @Get('/user')
    @CustomMessage("Liste des tickets récupérés avec succès pour cet utilisateur")
    @ApiOperation({
        summary: "Get all tickets of the connected user",
        description: "Cette méthode renvoie la liste des tickets de l’utilisateur connecté, qu’il soit un utilisateur normal ou un agent"
    })
    @ApiResponse({status: HttpStatus.OK, description: "List of tickets created by the logged-in user"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occured"})

    async getTicketsForUSer(@Req() req: Request){
        return await this.ticketService.getTicketsForUSer(req);
    }

    @Get('user/:status')
    @CustomMessage(`List of the tickets with the status specified successfully retrieved for this user`)
    @ApiOperation({
        summary: "Get all tickets of the connected user by a specific status(the name of the status)",
        description: "This method returns a list of tickets with the status specified by the logged-in user"
    })
    @ApiResponse({status: HttpStatus.OK, description: "List of tickets with the specified status of the logged-in user"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occured"})

    async getTicketsUsersByStatus(@Req() req: Request, @Param("status") status: TicketTypes) {
        return await this.ticketService.getTicketsUsersByStatus(req, status);
    }

    
    @Put(':id')
    @CustomMessage("Status successfully updated")
    @ApiOperation({
        summary: "Update ticket status",
        description: "Update ticket status using ticket id"
    })
    @ApiResponse({status: HttpStatus.OK, description: "Ticket status has been updated correctly"})
    @ApiResponse({status: HttpStatus.BAD_REQUEST, description: "Current status does not allow transition to specified status"})
    @ApiResponse({status: HttpStatus.FORBIDDEN, description: "User does not have permission to modify status"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occured"})

    async updateStatusTicket(@Param("id", ObjectIDValidationPipe) id: any, @Body() updateStatusDtos: UpdateStatusTicketDTO, @Req() req:Request) {
        return await this.ticketService.updateTicketStatus(id, updateStatusDtos, req)
    }
}
