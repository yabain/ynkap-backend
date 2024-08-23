import { SetMetadata } from "@nestjs/common";

export const CustomMessage = (message: string) => SetMetadata('customMessage', message);