import { plainToClass, Transform } from 'class-transformer';
import { IsString, IsNumber, IsOptional, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  MONGO_DATABASE_URL: string;

  @IsString()
  KEYCLOAK_SERVER_URI: string;

  @IsString()
  KEYCLOAK_SERVER_REALM: string;

  @IsString()
  KEYCLOAK_SERVER_CLIENTID: string;

  @IsString()
  KEYCLOAK_SERVER_SECRET: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  PORT?: number = 3000;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  REQUEST_TIMEOUT?: number = 120000;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}