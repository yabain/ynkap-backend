import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ApplicationController } from './controllers/application.controller';
import { ApplicationAuthController } from './controllers/application-auth.controller';
import { ApplicationService } from './services/application.services';
import { ApplicationAuthService } from './services/application-auth.service';
import { ApplicationKeyService } from './services/application-key.service';
import { KeyAuditService } from './services/key-audit.service';
import { KeyRotationService } from './services/key-rotation.service';
import { AuthBasicStrategy } from './strategies/auth-basic.strategy';
import { AuthJwtStrategy } from './strategies/auth-jwt.strategy';
import { Application, ApplicationSchema } from './models/application.schema';
import { ApplicationKey, ApplicationKeySchema } from './models/application-key.schema';
import { KeyAudit, KeyAuditSchema } from './models/key-audit.schema';
import { WalletModule } from '../wallet/wallet.module';
import { JWT_CONSTANT } from 'src/shared/config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
      { name: ApplicationKey.name, schema: ApplicationKeySchema },
      { name: KeyAudit.name, schema: KeyAuditSchema }
    ]),
    JwtModule.register({
      secret: JWT_CONSTANT.secret,
      signOptions: { expiresIn: JWT_CONSTANT.expiresIn }
    }),
    forwardRef(() => WalletModule)
  ],
  controllers: [ApplicationController, ApplicationAuthController],
  providers: [
    ApplicationService, 
    ApplicationAuthService,
    ApplicationKeyService,
    KeyAuditService, 
    KeyRotationService, 
    AuthBasicStrategy,
    AuthJwtStrategy
  ],
  exports: [
    ApplicationService, 
    ApplicationAuthService,
    ApplicationKeyService,
    KeyAuditService, 
    KeyRotationService
  ]
})
export class ApplicationModule {}
