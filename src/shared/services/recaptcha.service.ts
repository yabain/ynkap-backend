import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);
  private readonly secretKey: string;
  private readonly siteKey: string;
  private readonly verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('RECAPTCHA_SECRET_KEY') || '';
    this.siteKey = this.configService.get<string>('RECAPTCHA_SITE_KEY') || '';
    
    if (!this.secretKey) {
      this.logger.error('RECAPTCHA_SECRET_KEY not configured');
    }
    if (!this.siteKey) {
      this.logger.error('RECAPTCHA_SITE_KEY not configured');
    }
  }

  getSiteKey(): string {
    return this.siteKey;
  }

  async verifyToken(token: string, remoteIp?: string): Promise<boolean> {
    if (!token) {
      this.logger.warn('No reCAPTCHA token provided');
      return false;
    }

    try {
      const response = await axios.post(this.verifyUrl, null, {
        params: {
          secret: this.secretKey,
          response: token,
          remoteip: remoteIp,
        },
      });

      const { success, 'error-codes': errorCodes } = response.data;
      
      if (!success) {
        this.logger.error(`reCAPTCHA verification failed: ${JSON.stringify(errorCodes)}`);
        return false;
      }

      this.logger.debug(`reCAPTCHA v2 verified successfully for token prefix=${token.substring(0, 15)}...`);
      return true;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(`reCAPTCHA request failed: ${JSON.stringify(error.response?.data) || error.message}`);
      } else {
        this.logger.error(`Unexpected error during reCAPTCHA verification: ${error}`);
      }
      return false;
    }
  }
}