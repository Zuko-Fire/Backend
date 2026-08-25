import { ConfigService } from '@nestjs/config';

export const isDev = (configService: ConfigService): boolean => {
  return configService.get('NODE_ENV') === 'development';
};
