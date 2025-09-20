import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallet, WalletSchema } from './models/wallet.schema';
import { WalletService } from './services/wallet.service';
import { WalletController } from './controllers/wallet.controller';
import { ApplicationModule } from 'src/application/application.module';
import { FinancialTransactionModule } from 'src/financial-transaction/financial-transaction.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Wallet.name,
        schema: WalletSchema
      }
    ]),
    forwardRef(() => ApplicationModule),
    forwardRef(() => FinancialTransactionModule)
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService] // ✅ Important : exporter WalletService
})
export class WalletModule {}
