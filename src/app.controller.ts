import { Controller, Get, Redirect, Request, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('')
export class AppController {

  version = "1.0.0"
  constructor(private configService: ConfigService) {}
    @Get()
    getMainRoad(): string {
      return `Y-Nkap API Version ${this.configService.get<string>("NODE_ENV")} ${this.version}`;
    }
}
  
