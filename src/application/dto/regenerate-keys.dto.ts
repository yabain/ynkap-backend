import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegenerateKeysDto {
  @ApiProperty({
    description: 'Environment for which to regenerate keys',
    enum: ['test', 'prod'],
    example: 'test'
  })
  @IsNotEmpty()
  @IsEnum(['test', 'prod'], {
    message: 'Environment must be either "test" or "prod"'
  })
  environment: 'test' | 'prod';
}