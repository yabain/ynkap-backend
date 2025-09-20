import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Application, ApplicationSchema } from './models/application.schema';
import { ApplicationService } from './services/application.services';
import { ApplicationController } from './controllers/application.controller';
import { WalletModule } from 'src/wallet/wallet.module';
import { FinancialTransactionModule } from 'src/financial-transaction/financial-transaction.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthJwtGuard } from './guards/auth-jwt.guard';
import { AuthJwtStrategy } from './stategies/auth-jwt.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Application.name,
        schema: ApplicationSchema
      }
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN')
        }
      })
    }),
    forwardRef(() => WalletModule),
    forwardRef(() => FinancialTransactionModule)
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService, AuthJwtGuard, AuthJwtStrategy],
  exports: [ApplicationService, JwtModule]
})
export class ApplicationModule {}
