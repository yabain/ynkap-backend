import { Module } from "@nestjs/common";
import { TicketModule } from "src/ticket/ticket.module";
import { ChatGateway } from "./gateways/chat.gateway";
import { MessageModule } from "src/message/message.module";
import { NotificationsModule } from "src/notifications/notifications.module";
import { AiModule } from "src/ai/ai.module";

@Module({
    imports: [TicketModule, MessageModule, NotificationsModule, AiModule],
    providers: [ChatGateway],
    exports: [ChatGateway]
})
export class GatewayModule {}