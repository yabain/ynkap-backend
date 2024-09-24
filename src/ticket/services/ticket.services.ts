import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DataBaseService } from "src/shared/database/database.service";
import { Ticket, TicketDocument } from "../models/ticket.schema";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import {Connection, Model} from "mongoose";
import { KeycloakApiService } from "src/keycloak/keycloak-api.service";
import { TicketTypes } from "../enums/ticket-types.enum";
import { TicketStatus } from "../enums/ticket-status.enum";
import { TicketHistoryService } from "./ticket-history.service";


@Injectable()
export class TicketService extends DataBaseService<TicketDocument> {


    constructor(
        @InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
        @InjectConnection() connection: Connection,
        private keycloakApiService: KeycloakApiService,
        private ticketHistoryService: TicketHistoryService
    ){
        super(ticketModel, connection)
    }

    async isTicketExist(id): Promise<any>{
        const ticket = await this.findOneByField({_id: id});
        if(!ticket){
            throw new NotFoundException(`The ${id} id ticket cannot be found`);
        }else{
            return ;
        }
    }

    async createTicket(createTicketDtos, req): Promise<TicketDocument>{
        return this.executeWithTransaction(async (session) => {

            let role = req['user']['realm_access']['roles'];
            if(role.includes('manager'))
                throw new BadRequestException('A manager is not allowed to create a ticket');
            
            const roleMapping = {
                [TicketTypes.BUG]: 'bugs-solver',
                [TicketTypes.TRANSACTION]: 'transactions-solver',
                [TicketTypes.OTHERS]: 'other-problems-solver'
            }

            const ticketRole = roleMapping[createTicketDtos.type]
            if(!ticketRole){
                throw new BadRequestException('Invalid ticket type');
            }

            const userSolvers = await this.keycloakApiService.getUsersByRole(ticketRole, req);
            if(userSolvers.length === 0) {
                throw new NotFoundException('No user has the role required for the ticket to be created.')
            }

            const solver = userSolvers[Math.floor(Math.random()*userSolvers.length)]; // On arrondie à l'entier inférieur du resultat de Math.random() qui choisit un chiffre au hazard compris entre 0 et 1 et la taille du tableau

            const newTicket = this.createInstance({
                ...createTicketDtos,
                user: req['user']['sub'],
                assignTo: solver
            });
            await newTicket.save({session});
            return newTicket;
        }).catch((error => {
            throw error;
        }))
    }

    async getTicketsForUSer(req): Promise<Ticket[]>{
        let role = req['user']['realm_access']['roles'];

        const queryField = role.includes('user') && role.includes('manager') 
        ? {assignTo: req['user']['sub']}
        : {user: req['user']['sub']}

        const tickets = await this.findByField(queryField);
        return tickets;
    }

    //Récupération des tickets par le statut de ticket
    async getTicketsUsersByStatus(req, status): Promise<Ticket[]>{
        let role = req['user']['realm_access']['roles'];

        const queryField = role.includes('user') && role.includes('manager') 
        ? {assignTo: req['user']['sub']}
        : {user: req['user']['sub']}

        let tickets = await this.findByField({
            ...queryField,
            status: status.toUpperCase()
        });

        return tickets;
    }

    async updateTicketStatus(id, updateStatusDtos, req) {

        return this.executeWithTransaction(async (session) => {
            
            let ticket = await this.findOneByField({_id: id});
            if(!ticket){
                throw new BadRequestException(`Ticket with id ${id} not found`)
            }

            let manageRole = req['user']['realm_access']['roles'].find((role) => role === 'manager');
            if(manageRole !== 'manager'){
                throw new ForbiddenException(`Unauthorized user`)
            }

            // On définit le tableau nous permettant de valider la transition de statut du ticket
            const allowedTransition = {
                [TicketStatus.OPEN] : [TicketStatus.IN_PROCESS, TicketStatus.CLOSE],
                [TicketStatus.IN_PROCESS] : [TicketStatus.SOLVE, TicketStatus.CLOSE],
                [TicketStatus.SOLVE] : [TicketStatus.CLOSE]
            }
    
            let currentStatus = ticket.status;

            if((allowedTransition[currentStatus] == undefined ) || (!allowedTransition[currentStatus].includes(updateStatusDtos.newStatus))){
                throw new BadRequestException(`Unauthorized status change`);
            }
                    
            ticket.status = updateStatusDtos.newStatus;
            await ticket.save({session});
            await this.ticketHistoryService.createHistory(ticket._id, currentStatus, updateStatusDtos.newStatus, req['user']['sub'])
        }).catch(error => {
            throw error
        })
        
    }
}