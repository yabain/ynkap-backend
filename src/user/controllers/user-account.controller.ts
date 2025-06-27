import { Controller, Get, Param, Post, Req, UseGuards, Query, ForbiddenException } from '@nestjs/common';
import { KeycloakApiService } from 'src/keycloak/keycloak-api.service';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/keycloak/keycloak.decorator';
import { LogService } from 'src/logs/services/log.service';
import { LogLevel } from 'src/logs/enums/log-level.enum';
import { LogType } from 'src/logs/enums/log-type.enum';

@ApiTags('User Accounts')
@ApiBearerAuth()
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
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by username, first or last name, or email' })
  @ApiQuery({ name: 'email', required: false, type: String, description: 'Filter by email' })
  @ApiQuery({ name: 'username', required: false, type: String, description: 'Filter by username' })
  @ApiQuery({ name: 'firstName', required: false, type: String, description: 'Filter by first name' })
  @ApiQuery({ name: 'lastName', required: false, type: String, description: 'Filter by last name' })
  @ApiQuery({ name: 'exact', required: false, type: Boolean, description: 'If true, exact match is used for filtering' })
  @ApiResponse({ status: 200, description: 'List of user accounts' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 503, description: 'Keycloak service unavailable' })
  async getAllUsers(
    @Req() req,
    @Query('first') first?: number,
    @Query('max') max?: number,
    @Query('search') search?: string,
    @Query('email') email?: string,
    @Query('username') username?: string,
    @Query('firstName') firstName?: string,
    @Query('lastName') lastName?: string,
    @Query('exact') exact?: boolean
  ) {
    // Vérifier si l'utilisateur a le rôle admin
    const clientId = this.configService.get<string>('KEYCLOAK_SERVER_CLIENTID');
    if (!req['user']['resource_access'][clientId]?.roles.includes('admin')) {
      throw new ForbiddenException("This feature is only available to administrators");
    }

    try {
      // Journaliser l'action
      await this.logService.create({
        level: LogLevel.INFO,
        type: LogType.ACTIVITY,
        message: 'Admin requested list of all users',
        user: req['user'].sub,
        metadata: { first, max, search, email, username, firstName, lastName, exact }
      });

      return this.keycloakApiService.getAllUsers(req, { 
        first, 
        max, 
        search, 
        email, 
        username, 
        firstName, 
        lastName, 
        exact 
      });
    } catch (error) {
      // Journaliser l'erreur
      await this.logService.create({
        level: LogLevel.ERROR,
        type: LogType.SYSTEM,
        message: `Error retrieving users: ${error.message}`,
        user: req['user'].sub,
        metadata: { error: error.message, stack: error.stack }
      });
      
      throw error; // Laisser le filtre d'exception global gérer la réponse
    }
  }

  @Get(':userId')
  @Roles(['admin'])
  @ApiOperation({ summary: 'Get user account details' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User account details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 503, description: 'Keycloak service unavailable' })
  async getUserById(@Param('userId') userId: string, @Req() req) {
    // Vérifier si l'utilisateur a le rôle admin
    const clientId = this.configService.get<string>('KEYCLOAK_SERVER_CLIENTID');
    if (!req['user']['resource_access'][clientId]?.roles.includes('admin')) {
      throw new ForbiddenException("This feature is only available to administrators");
    }

    try {
      // Journaliser l'action
      await this.logService.create({
        level: LogLevel.INFO,
        type: LogType.ACTIVITY,
        message: `Admin requested details for user ${userId}`,
        user: req['user'].sub,
        metadata: { userId }
      });

      return this.keycloakApiService.getUserById(userId, req);
    } catch (error) {
      // Journaliser l'erreur
      await this.logService.create({
        level: LogLevel.ERROR,
        type: LogType.SYSTEM,
        message: `Error retrieving user ${userId}: ${error.message}`,
        user: req['user'].sub,
        metadata: { userId, error: error.message }
      });
      
      throw error;
    }
  }

  @Post(':userId/enable')
  @Roles(['admin'])
  @ApiOperation({ summary: 'Enable user account' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User account enabled' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 503, description: 'Keycloak service unavailable' })
  async enableUserAccount(@Param('userId') userId: string, @Req() req) {
    // Vérifier si l'utilisateur a le rôle admin
    const clientId = this.configService.get<string>('KEYCLOAK_SERVER_CLIENTID');
    if (!req['user']['resource_access'][clientId]?.roles.includes('admin')) {
      throw new ForbiddenException("This feature is only available to administrators");
    }

    try {
      await this.keycloakApiService.enableUserAccount(userId, req);
      
      // Journaliser le succès
      await this.logService.create({
        level: LogLevel.INFO,
        type: LogType.ACTIVITY,
        message: `Admin enabled account for user ${userId}`,
        user: req['user'].sub,
        metadata: { userId, action: 'enable' }
      });

      return { message: 'User account enabled successfully' };
    } catch (error) {
      // Journaliser l'erreur
      await this.logService.create({
        level: LogLevel.ERROR,
        type: LogType.SYSTEM,
        message: `Error enabling user ${userId}: ${error.message}`,
        user: req['user'].sub,
        metadata: { userId, error: error.message }
      });
      
      throw error;
    }
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







