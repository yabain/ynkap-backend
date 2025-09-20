import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { KeycloakConnectModule, AuthGuard, RoleGuard } from 'nest-keycloak-connect';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApplicationModule } from './application/application.module';
import { WalletModule } from './wallet/wallet.module';
import { TicketModule } from './ticket/ticket.module';
import { GatewayModule } from './chat-gateway/gateway.module';
import { MessageModule } from './message/message.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { FinancialTransactionModule } from './financial-transaction/financial-transaction.module';
import { FinancialPaymentModule } from './financial-payment/financial-payment.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FAQModule } from './faq/faq.module';
import { AttachmentModule } from './attachment/attachment.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { KeycloakDebugMiddleware } from './keycloak/keycloak-debug.middleware';
import { ActivityLoggerInterceptor } from './logs/interceptors/activity-logger.interceptor';
import { LogsModule } from './logs/logs.module';
import { SharedModule } from './shared/shared.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'dev'}`
    }),
    
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // Essayer différentes variables d'environnement pour l'URI MongoDB
        let uri = configService.get<string>('MONGODB_URI');
        if (!uri) {
          uri = configService.get<string>('MONGO_DATABASE_URL');
        }
        if (!uri) {
          throw new Error('MongoDB URI not defined. Check your environment variables.');
        }
        
        console.log(`Connecting to MongoDB: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
        
        return {
          uri,
          // Options de connexion optimisées
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              console.log('MongoDB connection established successfully');
            });
            connection.on('error', (err) => {
              console.error('MongoDB connection error:', err);
            });
            return connection;
          }
        };
      },
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
    NotificationsModule,
    FAQModule,
    AttachmentModule,
    LogsModule,
    AuthModule,
    UserModule,
    DashboardModule,
    SharedModule
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
    // Ajouter l'intercepteur de journalisation global
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLoggerInterceptor,
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
