import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

dotenv.config();

// ==================== ROLES & PERMISSIONS ====================

const ROLES = [
  { id: 1, name: 'super_admin' },
  { id: 2, name: 'admin' },
  { id: 3, name: 'editor' },
  { id: 4, name: 'viewer' },
  { id: 5, name: 'manager' },
];

const PERMISSIONS = [
  { id: 1, name: 'projects:create' },
  { id: 2, name: 'projects:read' },
  { id: 3, name: 'projects:update' },
  { id: 4, name: 'projects:delete' },
  { id: 5, name: 'polygons:create' },
  { id: 6, name: 'polygons:read' },
  { id: 7, name: 'polygons:update' },
  { id: 8, name: 'polygons:delete' },
  { id: 9, name: 'land_plots:create' },
  { id: 10, name: 'land_plots:read' },
  { id: 11, name: 'land_plots:update' },
  { id: 12, name: 'land_plots:delete' },
  { id: 13, name: 'maps:read' },
  { id: 14, name: 'documents:upload' },
  { id: 15, name: 'documents:read' },
  { id: 16, name: 'documents:delete' },
  { id: 17, name: 'users:manage' },
  { id: 18, name: 'reports:generate' },
];

const ROLE_PERMISSIONS: Array<{ role_id: number; permission_id: number }> = [
  ...PERMISSIONS.map((p) => ({ role_id: 1, permission_id: p.id })),
  ...PERMISSIONS.filter((p) => p.name !== 'users:manage').map((p) => ({
    role_id: 2,
    permission_id: p.id,
  })),
  ...[1, 2, 3, 5, 6, 7, 9, 10, 11, 14, 15].map((id) => ({
    role_id: 3,
    permission_id: id,
  })),
  ...[2, 6, 10, 13, 15].map((id) => ({ role_id: 4, permission_id: id })),
  ...[1, 2, 3, 13, 18].map((id) => ({ role_id: 5, permission_id: id })),
];

// ==================== USERS (20) ====================

const USERS = [
  {
    id: 1,
    name: 'Администратор Системы',
    email: 'admin@seeads.ru',
    password: 'Admin@123456',
    roles: ['super_admin'],
  },
  {
    id: 2,
    name: 'Иванов Петр Сергеевич',
    email: 'ivanov@seeads.ru',
    password: 'Password@1',
    roles: ['admin'],
  },
  {
    id: 3,
    name: 'Петрова Анна Михайловна',
    email: 'petrova@seeads.ru',
    password: 'Password@2',
    roles: ['editor'],
  },
  {
    id: 4,
    name: 'Сидоров Алексей Дмитриевич',
    email: 'sidorov@seeads.ru',
    password: 'Password@3',
    roles: ['viewer'],
  },
  {
    id: 5,
    name: 'Козлова Мария Игоревна',
    email: 'kozlova@seeads.ru',
    password: 'Password@4',
    roles: ['manager'],
  },
  {
    id: 6,
    name: 'Морозов Дмитрий Владимирович',
    email: 'morozov@seeads.ru',
    password: 'Password@5',
    roles: ['editor'],
  },
  {
    id: 7,
    name: 'Волкова Елена Андреевна',
    email: 'volkova@seeads.ru',
    password: 'Password@6',
    roles: ['viewer'],
  },
  {
    id: 8,
    name: 'Лебедев Сергей Николаевич',
    email: 'lebedev@seeads.ru',
    password: 'Password@7',
    roles: ['editor'],
  },
  {
    id: 9,
    name: 'Новикова Ольга Павловна',
    email: 'novikova@seeads.ru',
    password: 'Password@8',
    roles: ['admin'],
  },
  {
    id: 10,
    name: 'Федоров Андрей Юрьевич',
    email: 'fedorov@seeads.ru',
    password: 'Password@9',
    roles: ['viewer'],
  },
  {
    id: 11,
    name: 'Захарова Наталья Викторовна',
    email: 'zakharova@seeads.ru',
    password: 'Password@10',
    roles: ['editor'],
  },
  {
    id: 12,
    name: 'Борисов Роман Олегович',
    email: 'borisov@seeads.ru',
    password: 'Password@11',
    roles: ['manager'],
  },
  {
    id: 13,
    name: 'Голубева Виктория Сергеевна',
    email: 'golubeva@seeads.ru',
    password: 'Password@12',
    roles: ['editor'],
  },
  {
    id: 14,
    name: 'Виноградов Иван Константинович',
    email: 'vinogradov@seeads.ru',
    password: 'Password@13',
    roles: ['viewer'],
  },
  {
    id: 15,
    name: 'Соколова Елена Дмитриевна',
    email: 'sokolova@seeads.ru',
    password: 'Password@14',
    roles: ['admin'],
  },
  {
    id: 16,
    name: 'Михайлов Петр Александрович',
    email: 'mikhailov@seeads.ru',
    password: 'Password@15',
    roles: ['editor'],
  },
  {
    id: 17,
    name: 'Крылова Татьяна Ивановна',
    email: 'krylova@seeads.ru',
    password: 'Password@16',
    roles: ['viewer'],
  },
  {
    id: 18,
    name: 'Орлов Дмитрий Петрович',
    email: 'orlov@seeads.ru',
    password: 'Password@17',
    roles: ['manager'],
  },
  {
    id: 19,
    name: 'Павлова Мария Александровна',
    email: 'pavlova@seeads.ru',
    password: 'Password@18',
    roles: ['editor'],
  },
  {
    id: 20,
    name: 'Семенов Алексей Владимирович',
    email: 'semenov@seeads.ru',
    password: 'Password@19',
    roles: ['viewer'],
  },
];

// ==================== PROJECTS (20) ====================

const PROJECTS = [
  {
    id: 1,
    name: 'Межевание ул. Чехова',
    description: 'Проект по межеванию земельных участков на улице Чехова',
    status: 'approved',
    ownerId: 2,
  },
  {
    id: 2,
    name: 'Катаевская слобода',
    description: 'Кадастровые работы в районе Катаевской слободы',
    status: 'in_review',
    ownerId: 2,
  },
  {
    id: 3,
    name: 'ул. Фрунзе - участок 15',
    description: 'Межевание участка на улице Фрунзе',
    status: 'draft',
    ownerId: 9,
  },
  {
    id: 4,
    name: 'Приморский район',
    description: 'Комплексное межевание Приморского района',
    status: 'approved',
    ownerId: 5,
  },
  {
    id: 5,
    name: 'ул. Гоголя - 22',
    description: 'Вынос границ участка на улице Гоголя',
    status: 'returned',
    ownerId: 9,
  },
  {
    id: 6,
    name: 'Азовская набережная',
    description: 'Кадастровые работы на Азовской набережной',
    status: 'in_review',
    ownerId: 2,
  },
  {
    id: 7,
    name: 'ул. Ленина - 45',
    description: 'Объединение земельных участков',
    status: 'draft',
    ownerId: 15,
  },
  {
    id: 8,
    name: 'ТЦ Центральный',
    description: 'Межевание территории торгового центра',
    status: 'approved',
    ownerId: 5,
  },
  {
    id: 9,
    name: 'ул. Миру - 10',
    description: 'Разделение земельного участка',
    status: 'in_review',
    ownerId: 15,
  },
  {
    id: 10,
    name: 'Школьный переулок - 3',
    description: 'Кадастровый учет школьной территории',
    status: 'draft',
    ownerId: 2,
  },
  {
    id: 11,
    name: 'ул. Фрунзе - 78',
    description: 'Актуализация границ участка',
    status: 'approved',
    ownerId: 9,
  },
  {
    id: 12,
    name: 'Парк Гагарина',
    description: 'Межевание территории парка',
    status: 'returned',
    ownerId: 5,
  },
  {
    id: 13,
    name: 'ул. Чехова - 56',
    description: 'Перераспределение с муниципальной землей',
    status: 'in_review',
    ownerId: 15,
  },
  {
    id: 14,
    name: 'Сельхозугодия - юг',
    description: 'Кадастровые работы сельхозугодий на юге Таганрога',
    status: 'draft',
    ownerId: 2,
  },
  {
    id: 15,
    name: 'ул. Московская - 100',
    description: 'Межевание коммерческой недвижимости',
    status: 'approved',
    ownerId: 9,
  },
  {
    id: 16,
    name: 'Микрорайон Южный',
    description: 'Комплексное межевание микрорайона',
    status: 'in_review',
    ownerId: 5,
  },
  {
    id: 17,
    name: 'ул. Петровская - 12',
    description: 'Вынос границ в натуру',
    status: 'draft',
    ownerId: 15,
  },
  {
    id: 18,
    name: 'Пригородная зона',
    description: 'Кадастровые работы пригородной зоны',
    status: 'approved',
    ownerId: 2,
  },
  {
    id: 19,
    name: 'ул. Самокиша - 30',
    description: 'Разделение участка под ИЖС',
    status: 'returned',
    ownerId: 9,
  },
  {
    id: 20,
    name: 'Бульвар Рабочий',
    description: 'Межевание территории бульвара',
    status: 'in_review',
    ownerId: 5,
  },
];

// ==================== HELPERS ====================

const TAGANROG_CENTER = { lat: 47.1195, lon: 38.9689 };
const LAND_CATEGORIES = [
  'Земли сельскохозяйственного назначения',
  'Земли населенных пунктов',
  'Земли промышленного назначения',
  'Земли рекреационного назначения',
  'Земли запаса',
];
const PERMITTED_USES = [
  'Для ИЖС',
  'Для ЛПХ',
  'Для КРС',
  'Для многоквартирной застройки',
  'Для коммерческого использования',
  'Для общественной инфраструктуры',
  'Для сельскохозяйственного производства',
];
const STATUSES = ['registered', 'pending', 'approved', 'rejected'];
const MEASUREMENT_METHODS = ['ГНСС/GNSS', 'Тахеометр', 'Фотограмметрия'];
const COORD_SYS = [
  'Балтийская система высот',
  'Местная система координат',
  'Общеземная система',
];
const STREET_NAMES = [
  'Чехова',
  'Фрунзе',
  'Ленина',
  'Гоголя',
  'Московская',
  'Миру',
  'Патриса Лумумбы',
  'Петровская',
  'Самокиша',
  'Станционная',
];

function generatePolygon(
  centerLat: number,
  centerLon: number,
  size: number = 0.002,
): any {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [centerLon - size, centerLat - size],
        [centerLon + size, centerLat - size],
        [centerLon + size, centerLat + size],
        [centerLon - size, centerLat + size],
        [centerLon - size, centerLat - size],
      ],
    ],
  };
}

function generateCoordinates(
  centerLat: number,
  centerLon: number,
  pointCount: number = 8,
): Array<{
  point_number?: number;
  x: number;
  y: number;
  h?: number;
  method?: string;
  accuracy_mt?: number;
}> {
  const coords: Array<{
    point_number?: number;
    x: number;
    y: number;
    h?: number;
    method?: string;
    accuracy_mt?: number;
  }> = [];
  for (let i = 0; i < pointCount; i++) {
    const angle = (2 * Math.PI * i) / pointCount;
    const radius = 0.001 + Math.random() * 0.001;
    coords.push({
      point_number: i + 1,
      x: centerLon + radius * Math.cos(angle),
      y: centerLat + radius * Math.sin(angle),
      h: 15 + Math.random() * 10,
      method: 'ГНСС',
      accuracy_mt: parseFloat((0.02 + Math.random() * 0.05).toFixed(3)),
    });
  }
  return coords;
}

function getCenter(projectId: number) {
  const latOffset = (projectId % 10) * 0.003;
  const lonOffset = (projectId % 7) * 0.004;
  return {
    lat: TAGANROG_CENTER.lat + latOffset,
    lon: TAGANROG_CENTER.lon + lonOffset,
  };
}

// ==================== MAIN SEED ====================

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

  const roleRepo = dataSource.getRepository('roles');
  const permissionRepo = dataSource.getRepository('permissions');
  const rolePermissionRepo = dataSource.getRepository('role_permissions');
  const userRepo = dataSource.getRepository('users');
  const userRoleRepo = dataSource.getRepository('user_roles');
  const projectRepo = dataSource.getRepository('projects');
  const polygonRepo = dataSource.getRepository('polygons');
  const landPlotRepo = dataSource.getRepository('land_plots');
  const mapViewRepo = dataSource.getRepository('map_views');

  // ---- 1. Seed Roles ----
  console.log('\n📦 Seeding roles...');
  for (const role of ROLES) {
    const existing = await roleRepo.findOne({ where: { id: role.id } });
    if (!existing) {
      await roleRepo.save({ id: role.id, name: role.name });
      console.log(`  ✅ Role: ${role.name}`);
    } else {
      console.log(`  ⚠️  Role already exists: ${role.name}`);
    }
  }

  // ---- 2. Seed Permissions ----
  console.log('\n📦 Seeding permissions...');
  for (const perm of PERMISSIONS) {
    const existing = await permissionRepo.findOne({ where: { id: perm.id } });
    if (!existing) {
      await permissionRepo.save({ id: perm.id, name: perm.name });
      console.log(`  ✅ Permission: ${perm.name}`);
    } else {
      console.log(`  ⚠️  Permission already exists: ${perm.name}`);
    }
  }

  // ---- 3. Seed Role-Permissions ----
  console.log('\n📦 Seeding role-permissions...');
  for (const rp of ROLE_PERMISSIONS) {
    const existing = await rolePermissionRepo.findOne({
      where: { role_id: rp.role_id, permission_id: rp.permission_id },
    });
    if (!existing) {
      await rolePermissionRepo.save({
        role_id: rp.role_id,
        permission_id: rp.permission_id,
      });
    }
  }
  console.log(`  ✅ ${ROLE_PERMISSIONS.length} role-permission mappings`);

  // ---- 4. Seed Users ----
  console.log('\n📦 Seeding users...');
  const createdUsers: number[] = [];
  for (const userData of USERS) {
    const existing = await userRepo.findOne({ where: { id: userData.id } });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      await userRepo.save({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        roles: userData.roles,
        isActive: true,
      });
      createdUsers.push(userData.id);
      console.log(`  ✅ User: ${userData.name} (${userData.email})`);
    } else {
      console.log(`  ⚠️  User already exists: ${userData.email}`);
    }
  }
  console.log(`  ✅ ${createdUsers.length} users created`);

  // ---- 5. Seed Projects ----
  console.log('\n📦 Seeding projects...');
  for (const projectData of PROJECTS) {
    const existing = await projectRepo.findOne({
      where: { id: projectData.id },
    });
    if (!existing) {
      await projectRepo.save({
        id: projectData.id,
        name: projectData.name,
        description: projectData.description,
        status: projectData.status,
        owner_id: projectData.ownerId,
      });
      console.log(`  ✅ Project: ${projectData.name}`);
    } else {
      console.log(`  ⚠️  Project already exists: ${projectData.name}`);
    }
  }
  console.log(`  ✅ ${PROJECTS.length} projects created`);

  // ---- 6. Seed Polygons ----
  console.log('\n📦 Seeding polygons...');
  for (const project of PROJECTS) {
    const center = getCenter(project.id);
    const existing = await polygonRepo.findOne({ where: { id: project.id } });
    if (!existing) {
      await polygonRepo.save({
        id: project.id,
        project_id: project.id,
        name: `Полигон ${project.name}`,
        coordinates: generatePolygon(center.lat, center.lon),
        created_by: project.ownerId,
        updated_by: project.ownerId,
      });
      console.log(`  ✅ Polygon: ${project.name}`);
    } else {
      console.log(`  ⚠️  Polygon already exists: ${project.name}`);
    }
  }
  console.log(`  ✅ ${PROJECTS.length} polygons created`);

  // ---- 7. Seed Land Plots ----
  console.log('\n📦 Seeding land plots...');
  for (const project of PROJECTS) {
    const center = getCenter(project.id);
    const cadastralNumber = `61:${project.id < 10 ? '0' : ''}${project.id}:0${project.id < 10 ? project.id : project.id}:${(project.id % 50) + 1}`;
    const existing = await landPlotRepo.findOne({
      where: { cadastral_number: cadastralNumber },
    });
    if (!existing) {
      const area = 500 + Math.random() * 5000;
      const streetIndex = (project.id - 1) % STREET_NAMES.length;
      await landPlotRepo.save({
        id: project.id,
        cadastral_number: cadastralNumber,
        area: parseFloat(area.toFixed(2)),
        land_category: LAND_CATEGORIES[project.id % LAND_CATEGORIES.length],
        permitted_use: PERMITTED_USES[project.id % PERMITTED_USES.length],
        address: `г. Таганрог, ул. ${STREET_NAMES[streetIndex]}, ${project.id * 2 + 1}`,
        status: STATUSES[project.id % STATUSES.length],
        registration_date: new Date(
          2024,
          project.id % 12,
          (project.id % 28) + 1,
        ),
        owner_name: USERS[project.id % USERS.length].name,
        cadastral_cost: parseFloat(
          (5000000 + Math.random() * 50000000).toFixed(2),
        ),
        coordinate_system: COORD_SYS[project.id % COORD_SYS.length],
        coordinates_data: generateCoordinates(center.lat, center.lon),
        measurement_method:
          MEASUREMENT_METHODS[project.id % MEASUREMENT_METHODS.length],
        accuracy_mt: parseFloat((0.02 + Math.random() * 0.1).toFixed(3)),
        boundary_marker_type:
          project.id % 2 === 0 ? 'временный' : 'долговременный',
        polygon_id: project.id,
        adjacent_users: [
          {
            cadastral_number: `61:01:${project.id}:1`,
            name: 'Смежный собственник',
            fio: USERS[(project.id % USERS.length) + 1]?.name,
            boundary_part: 'северная',
          },
          {
            cadastral_number: `61:01:${project.id}:2`,
            name: 'Муниципальная земля',
            fio: null,
            boundary_part: 'южная',
          },
        ],
        boundary_agreement_act: {
          participants: [
            {
              fio: USERS[project.id % USERS.length].name,
              address: 'г. Таганрог',
            },
            {
              fio: USERS[(project.id + 1) % USERS.length].name,
              address: 'г. Таганрог',
            },
          ],
          signed_at: new Date(2024, project.id % 12, (project.id % 28) + 1),
        },
      });
      console.log(`  ✅ Land plot: ${project.name}`);
    } else {
      console.log(`  ⚠️  Land plot already exists: ${cadastralNumber}`);
    }
  }
  console.log(`  ✅ ${PROJECTS.length} land plots created`);

  // ---- 8. Seed Map Views ----
  console.log('\n📦 Seeding map views...');
  let mapViewCount = 0;
  for (let i = 0; i < 20; i++) {
    const project = PROJECTS[i % PROJECTS.length];
    const user = USERS[i % USERS.length];
    const center = getCenter(project.id);
    const lat = center.lat + (Math.random() - 0.5) * 0.01;
    const lon = center.lon + (Math.random() - 0.5) * 0.01;
    const zoom = 12 + Math.floor(Math.random() * 4);

    await mapViewRepo.save({
      project_id: project.id,
      user_id: user.id,
      lat,
      lon,
      zoom,
    });
    mapViewCount++;
  }
  console.log(`  ✅ ${mapViewCount} map views created`);

  // ---- Done ----
  console.log('\n🎉 Seed complete!');
  console.log('📊 Summary:');
  console.log(`   - ${ROLES.length} roles`);
  console.log(`   - ${PERMISSIONS.length} permissions`);
  console.log(`   - ${ROLE_PERMISSIONS.length} role-permission mappings`);
  console.log(`   - ${USERS.length} users`);
  console.log(`   - ${PROJECTS.length} projects`);
  console.log(`   - ${PROJECTS.length} polygons`);
  console.log(`   - ${PROJECTS.length} land plots`);
  console.log(`   - 20 map views`);
  console.log('\n📝 Login credentials:');
  console.log(`   Admin: admin@seeads.ru / Admin@123456`);
  console.log(`   User 2: ivanov@seeads.ru / Password@1`);

  await dataSource.destroy();
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
