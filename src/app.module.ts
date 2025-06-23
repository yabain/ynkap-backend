import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { KeycloakConnectModule, AuthGuard, RoleGuard } from 'nest-keycloak-connect';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApplicationModule } from './application/application.module';
import { WalletModule } from './wallet/wallet.module';
import { MessageModule } from './message/message.module';
import { TicketModule } from './ticket/ticket.module';
import { GatewayModule } from './chat-gateway/gateway.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { FinancialTransactionModule } from './financial-transaction/financial-transaction.module';
import { FinancialPaymentModule } from './financial-payment/financial-payment.module';
import { LogsModule } from './logs/logs.module';
import { ActivityLoggerMiddleware } from './logs/middleware/activity-logger.middleware';
import { ErrorLoggerInterceptor } from './logs/interceptors/error-logger.interceptor';
import { AuthModule } from './auth/auth.module';
import { KeycloakDebugMiddleware } from './keycloak/keycloak-debug.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    KeycloakConnectModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        authServerUrl: configService.get<string>('KEYCLOAK_SERVER_URI'),
        realm: configService.get<string>('KEYCLOAK_SERVER_REALM'),
        clientId: configService.get<string>('KEYCLOAK_SERVER_CLIENTID'),
        secret: configService.get<string>('KEYCLOAK_SERVER_SECRET'),
        // Ajouter des logs pour déboguer
        logLevels: ['verbose'],
        // S'assurer que les tokens sont correctement validés
        bearerOnly: true,
        // Vérifier si le token est valide à chaque requête
        verifyTokenAudience: false,
        // Utiliser le cookie pour stocker le token
        cookieKey: 'KEYCLOAK_JWT',
      }),
    }),
    ApplicationModule,
    WalletModule,
    MessageModule,
    TicketModule,
    GatewayModule,
    PaymentMethodsModule,
    FinancialTransactionModule,
    FinancialPaymentModule,
    LogsModule,
    AuthModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Configurer les gardes globaux pour Keycloak
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(KeycloakDebugMiddleware)
      .forRoutes('*'); // Appliquer à toutes les routes
  }
}
