import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PublicRouteGuard } from './public-route.guard';

@Module({
  providers: [
    PublicRouteGuard,  // Ajouter le garde comme fournisseur normal
    {
      provide: APP_GUARD,
      useClass: PublicRouteGuard,
    }
  ],
  exports: [PublicRouteGuard],
})
export class AuthModule {}


