import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';

const mockJwtService = {
  sign: jest.fn((payload) => `signed(${JSON.stringify(payload)})`),
  verify: jest.fn((token) => {
    // simple reversible encoding used in tests
    if (token.startsWith('valid:')) {
      return JSON.parse(token.slice(6));
    }
    throw new Error('invalid');
  }),
};

const mockUsersService = {
  findByUsername: jest.fn(),
  validatePassword: jest.fn(),
  findById: jest.fn(),
  hashPassword: jest.fn(),
  create: jest.fn(),
};

const mockRepo = {
  save: jest.fn(),
  findOne: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    // ensure mocks have default behaviour each run
    mockJwtService.sign.mockImplementation((p) => `signed(${JSON.stringify(p)})`);
    mockJwtService.verify.mockImplementation((token) => {
      if (token.startsWith('valid:')) {
        return JSON.parse(token.slice(6));
      }
      throw new Error('invalid');
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: UsersService, useValue: mockUsersService },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('returns user dto when credentials ok', async () => {
      const user = { id: 1, email: 'a', password: 'b' };
      mockUsersService.findByUsername.mockResolvedValue(user);
      mockUsersService.validatePassword.mockResolvedValue(true);
      const result = await service.validateUser('a', 'b');
      expect(result).toEqual({ id: 1, email: 'a' });
    });

    it('returns null when no user', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);
      const result = await service.validateUser('a', 'b');
      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      mockUsersService.findByUsername.mockRejectedValue(new Error('boom'));
      const result = await service.validateUser('a', 'b');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('signs tokens and saves refresh', async () => {
      const dto = { id: 2, name: 'n', roles: ['r'] };
      mockRepo.save.mockResolvedValue({});
      const tokens = await service.login(dto as any);
      expect(tokens.access_token).toContain('signed');
      expect(tokens.refresh_token).toContain('signed');
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('throws on missing fields', async () => {
      await expect(service.register({} as any)).rejects.toThrow();
    });
    it('creates user and returns tokens', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);
      mockUsersService.hashPassword.mockResolvedValue('h');
      mockUsersService.create.mockResolvedValue({
        id: 3,
        name: 'X',
        email: 'e',
        roles: [],
        password: 'h',
      });
      mockRepo.save.mockResolvedValue({});
      const res = await service.register({
        email: 'e',
        password: 'p',
        name: 'X',
      } as any);
      expect(res.access_token).toBeDefined();
      expect(res.refresh_token).toBeDefined();
    });
  });

  describe('refreshToken', () => {
    const goodToken = 'valid:' + JSON.stringify({ sub: 4, name: 'n', roles: [] });
    it('throws when verify fails', async () => {
      await expect(service.refreshToken('bad')).rejects.toThrow();
    });
    it('throws when not in db', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.refreshToken(goodToken)).rejects.toThrow();
    });
    it('throws when expired', async () => {
      mockRepo.findOne.mockResolvedValue({ expiresAt: new Date(0), revoked: false });
      await expect(service.refreshToken(goodToken)).rejects.toThrow();
    });
    it('works when valid', async () => {
      const now = new Date();
      mockRepo.findOne.mockResolvedValue({ expiresAt: new Date(now.getTime() + 10000), revoked: false, save: jest.fn() });
      mockUsersService.findById.mockResolvedValue({ id: 4, name: 'n', roles: [] });
      mockRepo.save.mockResolvedValue({});
      const out = await service.refreshToken(goodToken);
      expect(out.access_token).toBeDefined();
      expect(out.refresh_token).toBeDefined();
    });
  });
});
