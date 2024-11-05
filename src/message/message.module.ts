import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Message, MessageSchema } from "./models/message.schema";
import { MessageService } from "./services/message.service";



@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name: Message.name,
                schema: MessageSchema
            }
        ])
    ],
    exports: [MessageService],
    providers: [MessageService]
})
export class MessageModule {}