import { Controller, Get, HttpStatus, Redirect, Request, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiResponse } from '@nestjs/swagger';
import { AuthenticatedUser } from 'nest-keycloak-connect';

@Controller('')

export class AppController {

  version = "1.0.0"
  constructor(private configService: ConfigService) {}
    @Get()
    @ApiResponse({status: HttpStatus.OK, description: "The route displaying the application version"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    getMainRoad(): string {
      return `Y-Nkap API Version ${this.configService.get<string>("NODE_ENV")} ${this.version}`;
    }
}
  
