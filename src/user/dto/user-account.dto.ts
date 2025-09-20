import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UserAccountDTO {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Username' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'First name' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ description: 'Email' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'Account enabled status' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'Email verified status' })
  @IsBoolean()
  emailVerified: boolean;
}

export class UserEventDTO {
  @ApiProperty({ description: 'Event time' })
  time: number;

  @ApiProperty({ description: 'Event type' })
  type: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Client ID' })
  clientId: string;

  @ApiProperty({ description: 'IP address' })
  ipAddress: string;

  @ApiProperty({ description: 'Event details' })
  details: Record<string, any>;
}