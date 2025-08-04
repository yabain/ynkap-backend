import { Module } from "@nestjs/common";
import { TicketController } from "./controllers/ticket.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { HttpModule } from "@nestjs/axios";
import { Ticket, TicketSchema } from "./models/ticket.schema";
import { TicketService } from "./services/ticket.services";
import { TicketHistoryService } from "./services/ticket-history.service";
import { KeycloakApiService } from "../keycloak/keycloak-api.service";
import { TicketStatusHistory, TicketStatusHistorySchema } from "./models/ticket-modification-history.schema";
import { SharedModule } from "src/shared/shared.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
    imports: [
        MongooseModule.forFeature([
          {
            name: Ticket.name,
            schema: TicketSchema
          },
          {
            name: TicketStatusHistory.name,
            schema: TicketStatusHistorySchema
          }
        ]),
        HttpModule,
        SharedModule,
        NotificationsModule
    ],
    controllers: [TicketController],
    exports: [TicketService],
    providers: [TicketService, TicketHistoryService, KeycloakApiService]
})
export class TicketModule{}