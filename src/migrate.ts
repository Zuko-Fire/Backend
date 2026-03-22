import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

dotenv.config();

async function runMigrations() {
  const configService = new ConfigService();

  const dataSource = new DataSource({
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'db'),
    port: +configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME'),
    password: configService.get<string>('DB_PASSWORD'),
    database: configService.get<string>('DB_DATABASE'),
    entities: ['dist/**/*.entity{.ts,.js}'],
    migrations: ['dist/migrations/*{.ts,.js}'],
    migrationsRun: false,
    synchronize: false,
    logging: true,
  });

  try {
    console.log('🔄 Инициализация DataSource...');
    await dataSource.initialize();

    console.log('📋 Проверка ожидающих миграций...');
    const pending = await dataSource.showMigrations();
    if (!pending) {
      console.log('✅ Нет ожидающих миграций');
    } else {
      console.log('🔧 Применение миграций...');
      await dataSource.runMigrations();
      console.log('✅ Миграции успешно применены');
    }

    await dataSource.destroy();
    console.log('✨ Готово!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка миграций:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

void runMigrations();
