import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class GetAIResponseDTO {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  ticketType?: string;

  @IsOptional()
  @IsString()
  ticketId?: string;
}