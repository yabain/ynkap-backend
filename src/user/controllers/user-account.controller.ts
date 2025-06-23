import { Controller, Get, Param, Post, Req, UseGuards, Query, ForbiddenException } from '@nestjs/common';
import { KeycloakApiService } from 'src/keycloak/keycloak-api.service';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/keycloak/keycloak.decorator';
import { LogService } from 'src/logs/services/log.service';
import { LogLevel } from 'src/logs/enums/log-level.enum';
import { LogType } from 'src/logs/enums/log-type.enum';

@ApiTags('User Accounts')
@Controller('user-accounts')
export class UserAccountController {
  constructor(
    private readonly keycloakApiService: KeycloakApiService,
    private readonly configService: ConfigService,
    private readonly logService: LogService
  ) {}

  @Get()
  @Roles(['admin'])
  @ApiOperation({ summary: 'Get all user accounts' })
  @ApiQuery({ name: 'first', required: false, type: Number, description: 'First result to return' })
  @ApiQuery({ name: 'max', required: false, type: Number, description: 'Maximum number of results to return' })
  @ApiResponse({ status: 200, description: 'List of user accounts' })
  async getAllUsers(
    @Req() req,
    @Query('first') first?: number,
    @Query('max') max?: number
  ) {
    // Vérifier si l'utilisateur a le rôle admin
    const clientId = this.configService.get<string>('KEYCLOAK_SERVER_CLIENTID');
    if (!req['user']['resource_access'][clientId]?.roles.includes('admin')) {
      throw new ForbiddenException("This feature is only available to administrators");
    }

    // Journaliser l'action
    await this.logService.create({
      level: LogLevel.INFO,
      type: LogType.ACTIVITY,
      message: 'Admin requested list of all users',
      user: req['user'].sub,
      metadata: { first, max }
    });

    return this.keycloakApiService.getAllUsers(req, { first, max });
  }

  @Get(':userId')
  @Roles(['admin'])
  @ApiOperation({ summary: 'Get user account details' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User account details' })
  async getUserById(@Param('userId') userId: string, @Req() req) {
    // Vérifier si l'utilisateur a le rôle admin
    const clientId = this.configService.get<string>('KEYCLOAK_SERVER_CLIENTID');
    if (!req['user']['resource_access'][clientId]?.roles.includes('admin')) {
      throw new ForbiddenException("This feature is only available to administrators");
    }

    // Journaliser l'action
    await this.logService.create({
      level: LogLevel.INFO,
      type: LogType.ACTIVITY,
      message: `Admin requested details for user ${userId}`,
      user: req['user'].sub,
      metadata: { userId }
    });

    return this.keycloakApiService.getUserById(userId, req);
  }

  @Post(':userId/enable')
  @Roles(['admin'])
  @ApiOperation({ summary: 'Enable user account' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User account enabled' })
  async enableUserAccount(@Param('userId') userId: string, @Req() req) {
    // Vérifier si l'utilisateur a le rôle admin
    const clientId = this.configService.get<string>('KEYCLOAK_SERVER_CLIENTID');
    if (!req['user']['resource_access'][clientId]?.roles.includes('admin')) {
      throw new ForbiddenException("This feature is only available to administrators");
    }

    await this.keycloakApiService.enableUserAccount(userId, req);

    // Journaliser l'action
    await this.logService.create({
      level: LogLevel.INFO,
      type: LogType.ACTIVITY,
      message: `Admin enabled account for user ${userId}`,
      user: req['user'].sub,
      metadata: { userId, action: 'enable' }
    });

    return { message: 'User account enabled successfully' };
  }

  @Post(':userId/disable')
  @Roles(['admin'])
  @ApiOperation({ summary: 'Disable user account' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User account disabled' })
  async disableUserAccount(@Param('userId') userId: string, @Req() req) {
    // Vérifier si l'utilisateur a le rôle admin
    const clientId = this.configService.get<string>('KEYCLOAK_SERVER_CLIENTID');
    if (!req['user']['resource_access'][clientId]?.roles.includes('admin')) {
      throw new ForbiddenException("This feature is only available to administrators");
    }

    await this.keycloakApiService.disableUserAccount(userId, req);

    // Journaliser l'action
    await this.logService.create({
      level: LogLevel.INFO,
      type: LogType.ACTIVITY,
      message: `Admin disabled account for user ${userId}`,
      user: req['user'].sub,
      metadata: { userId, action: 'disable' }
    });

    return { message: 'User account disabled successfully' };
  }

  @Get(':userId/events')
  @Roles(['admin'])
  @ApiOperation({ summary: 'Get user events history' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'max', required: false, type: Number, description: 'Maximum number of events to return' })
  @ApiResponse({ status: 200, description: 'User events history' })
  async getUserEvents(
    @Param('userId') userId: string,
    @Req() req,
    @Query('max') max: number = 10
  ) {
    // Vérifier si l'utilisateur a le rôle admin
    const clientId = this.configService.get<string>('KEYCLOAK_SERVER_CLIENTID');
    if (!req['user']['resource_access'][clientId]?.roles.includes('admin')) {
      throw new ForbiddenException("This feature is only available to administrators");
    }

    // Journaliser l'action
    await this.logService.create({
      level: LogLevel.INFO,
      type: LogType.ACTIVITY,
      message: `Admin requested events history for user ${userId}`,
      user: req['user'].sub,
      metadata: { userId, max }
    });

    return this.keycloakApiService.getUserEvents(userId, req, { max });
  }
}