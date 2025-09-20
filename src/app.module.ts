import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { KeycloakConnectModule, RoleGuard, AuthGuard } from 'nest-keycloak-connect';
import { ScheduleModule } from '@nestjs/schedule';
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
import { ActivityLoggerInterceptor } from './logs/interceptors/activity-logger.interceptor';
import { AuthModule } from './auth/auth.module';
import { KeycloakDebugMiddleware } from './keycloak/keycloak-debug.middleware';
import { ApplicationAuthMiddleware } from './application/middleware/application-auth.middleware';
import { UserModule } from './user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
// import { CustomKeycloakGuard } from './keycloak/custom-keycloak.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'dev'}`
    }),
    ScheduleModule.forRoot(),
    
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
        logLevels: ['verbose'],
        bearerOnly: true,
        verifyTokenAudience: false,
        // Ajoutez ces paramètres pour la validation du token
        'ssl-required': 'external',
        'public-client': false,
        'confidential-port': 0,
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
    AuthModule,
    UserModule,
    DashboardModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLoggerInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Appliquer le middleware d'auth application UNIQUEMENT sur les 3 routes spécifiques
    consumer
      .apply(ApplicationAuthMiddleware)
      .forRoutes(
        { path: 'application-auth/login', method: RequestMethod.POST },
        { path: 'application-auth/verify', method: RequestMethod.GET },
        { path: 'application-auth/refresh', method: RequestMethod.POST }
      );
      
    consumer
      .apply(KeycloakDebugMiddleware)
      .exclude(
        { path: 'application-auth/login', method: RequestMethod.POST },
        { path: 'application-auth/verify', method: RequestMethod.GET },
        { path: 'application-auth/refresh', method: RequestMethod.POST }
      )
      .forRoutes('*');
  }
}
