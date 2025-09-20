import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getHello(): string {
    return 'Hello World!';
  }

  getVersion(): string {
    const version = '1.2.0';
    const env = this.configService.get<string>('NODE_ENV') || 'dev';
    return `Y-Nkap API Version ${env} ${version}`;
  }
}