import { SetMetadata } from '@nestjs/common';

export const CUSTOM_MESSAGE_KEY = 'custom_message';
export const CustomMessage = (message: string) => SetMetadata('customMessage', message);
