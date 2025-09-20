import { Module } from '@nestjs/common';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';
import { UserModule } from '../user/user.module';
import { ApplicationModule } from '../application/application.module';
import { FinancialTransactionModule } from '../financial-transaction/financial-transaction.module';

@Module({
  imports: [
    UserModule,
    ApplicationModule,
    FinancialTransactionModule
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService]
})
export class DashboardModule {}