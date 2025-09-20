import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Req, UseInterceptors } from "@nestjs/common";
import { CreateTicketDTO } from "../dtos/create-ticket.dto";
import { AddMessageDTO } from "../dtos/add-message.dto";
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
    @CustomMessage("List of tickets successfully retrieved for this user")
    @ApiOperation({
        summary: "Get all tickets for current user",
        description: "Retrieve all tickets for the current user"
    })
    @ApiResponse({status: HttpStatus.OK, description: "List of tickets for current user"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occurred"})

    async getTicketsForUser(@Req() req: Request) {
        return await this.ticketService.getTicketsForUser(req);
    }

    @Get(':id')
    @CustomMessage("Ticket successfully retrieved")
    @ApiOperation({
        summary: "Get a single ticket by ID",
        description: "Retrieve a single ticket with user information populated"
    })
    @ApiResponse({status: HttpStatus.OK, description: "Ticket successfully retrieved"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "Ticket not found"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occurred"})

    async getTicketById(
        @Param('id', ObjectIDValidationPipe) ticketId: string,
        @Req() req: Request
    ) {
        return await this.ticketService.getTicketByIdWithUserInfo(ticketId, req);
    }

    @Post(':id/messages')
    @CustomMessage("Message successfully added to ticket")
    @ApiOperation({
        summary: "Add a message to a ticket",
        description: "This method adds a new message to an existing ticket, including optional attachments and related FAQs"
    })
    @ApiResponse({status: HttpStatus.CREATED, description: "Message successfully added to ticket"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "Ticket not found"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "User not authorized to add message to this ticket"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occured"})

    async addMessageToTicket(
        @Param('id', ObjectIDValidationPipe) ticketId: string,
        @Body() messageDto: AddMessageDTO,
        @Req() req: Request
    ) {
        return await this.ticketService.addMessageToTicket(ticketId, messageDto, req);
    }

    @Get(':id/messages')
    @CustomMessage("Messages successfully retrieved")
    @ApiOperation({
        summary: "Get all messages for a ticket",
        description: "This method retrieves all messages associated with a specific ticket"
    })
    @ApiResponse({status: HttpStatus.OK, description: "List of messages for the ticket"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "Ticket not found"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "User not authorized to view messages"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occured"})

    async getTicketMessages(
        @Param('id', ObjectIDValidationPipe) ticketId: string,
        @Req() req: Request
    ) {
        return await this.ticketService.getTicketMessages(ticketId, req);
    }

    @Delete(':id/messages/:messageId')
    @CustomMessage("Message successfully deleted")
    @ApiOperation({
        summary: "Delete a message from a ticket",
        description: "This method deletes a specific message from a ticket. Users can only delete their own messages."
    })
    @ApiResponse({status: HttpStatus.OK, description: "Message successfully deleted"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "Ticket or message not found"})
    @ApiResponse({status: HttpStatus.FORBIDDEN, description: "User not authorized to delete this message"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occured"})

    async deleteMessage(
        @Param('id', ObjectIDValidationPipe) ticketId: string,
        @Param('messageId', ObjectIDValidationPipe) messageId: string,
        @Req() req: Request
    ) {
        return await this.ticketService.deleteMessage(ticketId, messageId, req);
    }

    @Put(':id/status')
    @CustomMessage("Ticket status successfully updated")
    @ApiOperation({
        summary: "Update ticket status",
        description: "This method updates the status of a ticket and sends notifications"
    })
    @ApiResponse({status: HttpStatus.OK, description: "Ticket status updated successfully"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "Ticket not found"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "User not authorized to update status"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occured"})

    async updateTicketStatus(
        @Param('id', ObjectIDValidationPipe) ticketId: string,
        @Body() statusDto: UpdateStatusTicketDTO,
        @Req() req: Request
    ) {
        return await this.ticketService.updateTicketStatus(ticketId, statusDto, req);
    }

    @Get('user/:status')
    @CustomMessage(`List of tickets with specified status successfully retrieved for this user`)
    @ApiOperation({
        summary: "Get tickets by status for current user",
        description: "Retrieve tickets for the current user filtered by status"
    })
    @ApiResponse({status: HttpStatus.OK, description: "List of tickets with specified status"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occurred"})

    async getTicketsByStatus(@Req() req: Request, @Param("status") status: string) {
        return await this.ticketService.getTicketsByStatus(req, status);
    }

    @Get(':id/permissions')
    @CustomMessage('Ticket permissions retrieved successfully')
    @ApiOperation({
        summary: "Get user permissions for a specific ticket",
        description: "Retrieve what actions the current user can perform on a ticket"
    })
    @ApiResponse({status: HttpStatus.OK, description: "User permissions for the ticket"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "Ticket not found"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "User not authenticated"})

    async getTicketPermissions(
        @Param('id', ObjectIDValidationPipe) ticketId: string,
        @Req() req: Request
    ) {
        return await this.ticketService.getTicketPermissions(ticketId, req);
    }

    @Get('status/workflow')
    @CustomMessage('Status workflow information retrieved successfully')
    @ApiOperation({
        summary: "Get status workflow configuration",
        description: "Retrieve the complete status workflow with transitions and permissions"
    })
    @ApiResponse({status: HttpStatus.OK, description: "Status workflow configuration"})

    async getStatusWorkflow() {
        return await this.ticketService.getStatusWorkflow();
    }
}
