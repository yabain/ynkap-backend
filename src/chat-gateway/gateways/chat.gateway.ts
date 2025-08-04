import { UsePipes, ValidationPipe } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import mongoose from "mongoose";
import { Server, Socket } from "socket.io";
import { CreateMessageDTO } from "src/message/dtos/create-message.dtos";
import { MessageService } from "src/message/services/message.service";
import { ObjectIDValidationPipe } from "src/shared/pipes/objectID.pipe";
import { TicketService } from "src/ticket/services/ticket.services";

@WebSocketGateway({
    cors: {
        origin: "*"
    }
})

export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect{
    constructor(
        private ticketService: TicketService,
        private messageService: MessageService
    ){}

    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket, ...args: any[]){
        console.log(`The client socket ${client.id} is connected to the canal`);
        client.emit('connected', {message : `${client.id} is connected to chat`})
    }

    handleDisconnect(client: any){
        console.log(`The client ${client.id} has logged out`)
    }

    // Initialisation d'une nouvelle consersation
    @SubscribeMessage('joinConversation')
    async handleJoinConversation(
        @ConnectedSocket() client: Socket, 
        @MessageBody("ticket", ObjectIDValidationPipe) ticketID: mongoose.Types.ObjectId) {
            try {
                await this.ticketService.isTicketExist(ticketID.toString());

                //Création d'une room pour les utilisateurs concernés par le ticket
                client.join(ticketID.toString())
                const messages = await this.messageService.getMessagesByTicketId(ticketID);
                client.emit('messages', messages);
            } catch (error) {
                console.error({ error: error.message});
                client.emit('error', { message: 'Une erreur s\'est produite lorsque le client à tenter de joindre la conversation'})
                throw error; 
            }

    }

    //Envoi d'un message
    @SubscribeMessage('sendMessage')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    async handleNewMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() createMessageDtos : CreateMessageDTO, 
        ){
            try {
                const message = await this.messageService.createMessage(createMessageDtos);
                this.server.to(createMessageDtos.ticket.toString()).emit('newMessage', message)
            } catch (error) {
                console.error({ error: error.message});
                client.emit('error', { message: 'Une erreur s\'est produite lors de l\'envoi de nouveaux messages'});
                throw error;
            }
    }

}