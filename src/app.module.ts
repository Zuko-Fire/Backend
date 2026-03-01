import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { User } from './modules/users/entities/user.entity';
import { RefreshToken } from './modules/auth/entities/refresh-token.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // ← Добавьте это
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // ← Добавьте логирование здесь
        const config = {
          type: 'postgres' as const,
          host: configService.get<string>('DB_HOST'),
          port: +configService.get<number>('DB_PORT', 5432), // ← Преобразуйте в number
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_DATABASE'),
          entities: [User, RefreshToken],
          synchronize: true,
        };

        console.log('=== TYPEORM CONFIG ===');
        console.log('Host:', config.host);
        console.log('Port:', config.port, typeof config.port);
        console.log('Username:', config.username);
        console.log('Database:', config.database);
        console.log('=====================');

        return config;
      },
    }),
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
