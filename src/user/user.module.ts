import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './models/user.shema'; 
import { UserService } from './services/user.services';
import { UserController } from './controllers/user.controller';
import { UserAccountController } from './controllers/user-account.controller';
import { CreateUserMiddleware } from './middleware/user-auth.middleware';
import { KeycloakModule } from 'src/keycloak/keycloak.module';
import { LogsModule } from 'src/logs/logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema }
    ]),
    KeycloakModule,
    LogsModule
  ],
  controllers: [
    UserController,
    UserAccountController
  ],
  providers: [
    UserService,
    CreateUserMiddleware
  ],
  exports: [
    UserService,
    CreateUserMiddleware
  ]
})
export class UserModule {}
