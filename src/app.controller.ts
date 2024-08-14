import { Controller, Get, Redirect, Request, UseGuards } from '@nestjs/common';

@Controller('')
export class AppController {
  constructor() {}
    @Get()
    getHello(): string {
      return 'Hello World!';
    }
}
  
