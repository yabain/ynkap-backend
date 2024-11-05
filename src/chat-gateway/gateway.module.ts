import { Module } from "@nestjs/common";
import { TicketModule } from "src/ticket/ticket.module";
import { ChatGateway } from "./gateways/chat.gateway";
import { MessageModule } from "src/message/message.module";

@Module({
    imports: [TicketModule, MessageModule],
    providers: [ChatGateway],
    exports: []
})
export class GatewayModule {}