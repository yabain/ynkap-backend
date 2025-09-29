import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AiAnswerDto {
  @ApiProperty({
    description: 'User message or ticket content',
    example: 'I cannot login to my account',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class AiResponseDto {
  @ApiProperty({
    description: 'AI-generated answer',
    example: 'For login issues: 1) Check your username and password...',
  })
  answer: string;

  @ApiProperty({
    description: 'Response timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;
}