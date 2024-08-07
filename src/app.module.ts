import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { UserModule } from './user/user.module';
import { APP_GUARD } from '@nestjs/core';
import { KeycloakAuthGuard, KeycloakResourceGuard, KeycloakRoleGuard } from './keycloak/keycloak.guard';
import { SharedModule } from './shared/shared.module';
import { CreateUserMiddleware } from './user/middleware/user-auth.middleware';

@Module({
  imports: [
    SharedModule,
    UserModule, 
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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(CreateUserMiddleware)
    .forRoutes( { path: '/dashboard', method: RequestMethod.GET })
  }
}
