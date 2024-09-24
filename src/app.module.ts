import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { UserModule } from './user/user.module';
import { APP_GUARD } from '@nestjs/core';
import { KeycloakAuthGuard, KeycloakResourceGuard, KeycloakRoleGuard } from './keycloak/keycloak.guard';
import { SharedModule } from './shared/shared.module';
import { ApplicationModule } from './application/application.module';
import { WalletModule } from './wallet/wallet.module';
import { TicketModule } from './ticket/ticket.module';
import { GatewayModule } from './chat-gateway/gateway.module';
import { MessageModule } from './message/message.module';

@Module({
  imports: [
    SharedModule,
    UserModule, 
    ApplicationModule,
    WalletModule,
    MessageModule,
    TicketModule,
    GatewayModule
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: KeycloakAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: KeycloakResourceGuard
    },
    {
      provide: APP_GUARD,
      useClass: KeycloakRoleGuard
    }
  ],
})
export class AppModule {

}
