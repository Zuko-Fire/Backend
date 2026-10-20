import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

dotenv.config();

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'app_db',
    entities: ['dist/**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  console.log('✅ DataSource initialized');

  const userRepository = dataSource.getRepository('users');
  const refreshTokenRepository = dataSource.getRepository('refresh_tokens');

  // Admin credentials from env or defaults
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
  const adminName = process.env.ADMIN_NAME || 'System Administrator';

  // Check if admin already exists
  const existingAdmin = await userRepository.findOne({ where: { email: adminEmail } });
  if (existingAdmin) {
    console.log(`⚠️  Admin user already exists: ${adminEmail}`);
    console.log(`   ID: ${existingAdmin.id}`);
    console.log(`   Name: ${existingAdmin.name}`);
    await dataSource.destroy();
    process.exit(0);
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const admin = userRepository.create({
    email: adminEmail,
    name: adminName,
    password: hashedPassword,
    roles: ['admin'],
    isActive: true,
  });

  await userRepository.save(admin);
  console.log('✅ Admin user created:');
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`   Name: ${adminName}`);
  console.log(`   ID: ${admin.id}`);
  console.log('');
  console.log('📝 To login:');
  console.log(`   POST /auth/login`);
  console.log(`   Body: { "email": "${adminEmail}", "password": "${adminPassword}" }`);

  await dataSource.destroy();
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
