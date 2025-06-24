import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from 'nest-keycloak-connect';

@Controller('')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public() 
  @ApiResponse({status: HttpStatus.OK, description: "L’itinéraire affichant la version de l’application"})
  getMainRoad(): string {
    return this.appService.getVersion();
  }
}
  
