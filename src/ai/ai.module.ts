import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiService } from './ai.service';
import { AgentHandoffService } from './agent-handoff.service';
import { AgentAvailabilityService } from '../user/services/agent-availability.service';
import { User, UserSchema } from '../user/models/user.schema';
import { TicketModule } from '../ticket/ticket.module';
import { MessageModule } from '../message/message.module';
import { TicketService } from '../ticket/services/ticket.services';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => TicketModule),
    MessageModule
  ],
  providers: [
    AiService, 
    AgentHandoffService, 
    AgentAvailabilityService,
    {
      provide: 'TicketService',
      useFactory: (ticketService: TicketService) => ticketService,
      inject: [TicketService]
    }
  ],
  exports: [AiService, AgentHandoffService, AgentAvailabilityService],
})
export class AiModule {}