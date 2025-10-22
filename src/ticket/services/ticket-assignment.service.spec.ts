import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { TicketAssignmentService } from './ticket-assignment.service';

describe('TicketAssignmentService', () => {
  let service: TicketAssignmentService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        'KEYCLOAK_SERVER_URI': 'http://localhost:8080',
        'KEYCLOAK_SERVER_REALM': 'test-realm',
        'KEYCLOAK_CLIENT_UUID': 'test-client-uuid',
        'TICKET_ASSIGNMENT_CLIENT_ID': 'ticket-assignment-client',
        'TICKET_ASSIGNMENT_CLIENT_SECRET': 'test-secret',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketAssignmentService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TicketAssignmentService>(TicketAssignmentService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAssignmentToken', () => {
    it('should return cached token if not expired', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'test-token',
          expires_in: 3600,
        },
      };

      mockHttpService.post.mockReturnValue(of(mockTokenResponse));

      // First call should fetch new token
      const token1 = await (service as any).getAssignmentToken();
      expect(token1).toBe('test-token');

      // Second call should return cached token
      const token2 = await (service as any).getAssignmentToken();
      expect(token2).toBe('test-token');
      expect(mockHttpService.post).toHaveBeenCalledTimes(1);
    });

    it('should handle authentication errors', async () => {
      mockHttpService.post.mockImplementation(() => {
        throw new Error('Authentication failed');
      });

      await expect((service as any).getAssignmentToken()).rejects.toThrow(
        'Failed to authenticate ticket assignment service'
      );
    });
  });

  describe('getUsersByRole', () => {
    it('should return users with specified role', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'test-token',
          expires_in: 3600,
        },
      };

      const mockUsersResponse = {
        data: [
          { id: 'user1', username: 'agent1' },
          { id: 'user2', username: 'agent2' },
        ],
      };

      mockHttpService.post.mockReturnValue(of(mockTokenResponse));
      mockHttpService.get.mockReturnValue(of(mockUsersResponse));

      const result = await service.getUsersByRole('bugs-solver');

      expect(result).toEqual(['user1', 'user2']);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'http://localhost:8080/admin/realms/test-realm/clients/test-client-uuid/roles/bugs-solver/users',
        {
          headers: { Authorization: 'Bearer test-token' },
        }
      );
    });

    it('should handle API errors', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'test-token',
          expires_in: 3600,
        },
      };

      mockHttpService.post.mockReturnValue(of(mockTokenResponse));
      mockHttpService.get.mockImplementation(() => {
        throw new Error('API Error');
      });

      await expect(service.getUsersByRole('bugs-solver')).rejects.toThrow(
        'Failed to fetch users with role bugs-solver'
      );
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'test-token',
          expires_in: 3600,
        },
      };

      const mockRolesResponse = {
        data: {
          realmMappings: [
            { name: 'bugs-solver' },
            { name: 'user' },
          ],
        },
      };

      mockHttpService.post.mockReturnValue(of(mockTokenResponse));
      mockHttpService.get.mockReturnValue(of(mockRolesResponse));

      const result = await service.getUserRoles('user1');

      expect(result).toEqual({
        realmMappings: [
          { name: 'bugs-solver' },
          { name: 'user' },
        ],
      });
    });
  });

  describe('hasRole', () => {
    it('should return true if user has the role', async () => {
      jest.spyOn(service, 'getUserRoles').mockResolvedValue({
        realmMappings: [
          { name: 'bugs-solver' },
          { name: 'user' },
        ],
      });

      const result = await service.hasRole('user1', 'bugs-solver');
      expect(result).toBe(true);
    });

    it('should return false if user does not have the role', async () => {
      jest.spyOn(service, 'getUserRoles').mockResolvedValue({
        realmMappings: [
          { name: 'user' },
        ],
      });

      const result = await service.hasRole('user1', 'bugs-solver');
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      jest.spyOn(service, 'getUserRoles').mockRejectedValue(new Error('API Error'));

      const result = await service.hasRole('user1', 'bugs-solver');
      expect(result).toBe(false);
    });
  });

  describe('getAvailableAgents', () => {
    it('should return available agents for BUG tickets', async () => {
      jest.spyOn(service, 'getUsersByRole').mockResolvedValue(['user1', 'user2']);
      jest.spyOn(service, 'hasRole').mockResolvedValue(true);

      const result = await service.getAvailableAgents('BUG');

      expect(result).toEqual(['user1', 'user2']);
      expect(service.getUsersByRole).toHaveBeenCalledWith('bugs-solver');
    });

    it('should return available agents for TRANSACTION tickets', async () => {
      jest.spyOn(service, 'getUsersByRole').mockResolvedValue(['user3', 'user4']);
      jest.spyOn(service, 'hasRole').mockResolvedValue(true);

      const result = await service.getAvailableAgents('TRANSACTION');

      expect(result).toEqual(['user3', 'user4']);
      expect(service.getUsersByRole).toHaveBeenCalledWith('transactions-solver');
    });

    it('should throw error for invalid ticket type', async () => {
      await expect(service.getAvailableAgents('INVALID')).rejects.toThrow(
        'Invalid ticket type: INVALID'
      );
    });

    it('should filter out users without the required role', async () => {
      jest.spyOn(service, 'getUsersByRole').mockResolvedValue(['user1', 'user2', 'user3']);
      jest.spyOn(service, 'hasRole')
        .mockResolvedValueOnce(true)  // user1 has role
        .mockResolvedValueOnce(false) // user2 doesn't have role
        .mockResolvedValueOnce(true); // user3 has role

      const result = await service.getAvailableAgents('BUG');

      expect(result).toEqual(['user1', 'user3']);
    });
  });

  describe('selectRandomAgent', () => {
    it('should return a random agent from available agents', async () => {
      jest.spyOn(service, 'getAvailableAgents').mockResolvedValue(['user1', 'user2', 'user3']);

      const result = await service.selectRandomAgent('BUG');

      expect(['user1', 'user2', 'user3']).toContain(result);
      expect(service.getAvailableAgents).toHaveBeenCalledWith('BUG');
    });

    it('should return null if no agents available', async () => {
      jest.spyOn(service, 'getAvailableAgents').mockResolvedValue([]);

      const result = await service.selectRandomAgent('BUG');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(service, 'getAvailableAgents').mockRejectedValue(new Error('API Error'));

      await expect(service.selectRandomAgent('BUG')).rejects.toThrow(
        'Failed to select agent for BUG ticket'
      );
    });
  });
}); 