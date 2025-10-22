import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TicketService } from '../ticket/services/ticket.services';

async function migratePriority() {
  console.log('🔄 Starting ticket priority migration...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const ticketService = app.get(TicketService);
  
  try {
    await ticketService.migratePriorityField();
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await app.close();
  }
}

migratePriority();