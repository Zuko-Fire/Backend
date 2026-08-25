// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectModule } from './modules/project/project.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');

        const config = {
          type: 'postgres' as const,
          host: configService.get<string>('DB_HOST'),
          port: +configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_DATABASE'),
          entities: ['dist/**/*.entity{.ts,.js}'],
          migrations: ['dist/migrations/*{.ts,.js}'],
          migrationsRun: false,
          synchronize: true,
          autoLoadEntities: true, // ← Добавлено
          logging: nodeEnv === 'development',
          // Опционально: SSL для production
          ssl: nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
        };

        // Валидация обязательных переменных
        const required = [
          'DB_HOST',
          'DB_USERNAME',
          'DB_PASSWORD',
          'DB_DATABASE',
        ];
        for (const key of required) {
          if (!configService.get(key)) {
            throw new Error(`❌ Missing env variable: ${key}`);
          }
        }

        // Логирование только в dev
        if (nodeEnv === 'development') {
          console.log('🔗 TypeORM Config:', {
            host: config.host,
            port: config.port,
            database: config.database,
            entities: config.entities,
            migrations: config.migrations,
          });
        }

        return config;
      },
    }),

    AuthModule,
    UsersModule,
    ProjectModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
