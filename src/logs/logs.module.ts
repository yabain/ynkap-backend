import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Log, LogSchema } from './schemas/log.schema';
import { LogService } from './services/log.service';
import { LogController } from './controllers/log.controller';
import { TransactionLogService } from './services/transaction-log.service';
import { TransactionLogController } from './controllers/transaction-log.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Log.name, schema: LogSchema }
    ])
  ],
  controllers: [
    LogController,
    TransactionLogController
  ],
  providers: [
    LogService,
    TransactionLogService
  ],
  exports: [
    LogService,
    TransactionLogService
  ]
})
export class LogsModule {}




