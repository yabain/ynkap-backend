import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Application, ApplicationSchema } from './models';
import { ApplicationService } from './services';
import { ApplicationController } from './controllers/application.controller';
import { ApplicationAuthService } from './services/application-auth.service';
import { ApplicationAuthController } from './controllers/application-auth.controller';
import { BasicStrategy } from './stategies/auth-basic.stategy';
import { AuthJwtStrategy } from './stategies/auth-jwt.strategy';
import { JWT_CONSTANT } from 'src/shared/config';
import { WalletModule } from 'src/wallet/wallet.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Application.name, schema: ApplicationSchema }
        ]),
        PassportModule,
        JwtModule.register({
            secret: JWT_CONSTANT.secret,
            signOptions: { expiresIn: JWT_CONSTANT.expiresIn }
        }),
        WalletModule
    ],
    controllers: [
        ApplicationController,
        ApplicationAuthController
    ],
    providers: [
        ApplicationService,
        ApplicationAuthService,
        BasicStrategy,
        AuthJwtStrategy
    ],
    exports: [
        ApplicationService,
        ApplicationAuthService
    ]
})
export class ApplicationModule {}
