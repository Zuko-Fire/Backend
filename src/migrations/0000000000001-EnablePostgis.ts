// src/migrations/0000000000001-EnablePostgis.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnablePostgis0000000000001 implements MigrationInterface {
  name = 'EnablePostgis0000000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Включаем расширения PostGIS
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis_topology`);

    console.log('✅ PostGIS extensions enabled');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS postgis_topology`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS postgis`);

    console.log('🔄 PostGIS extensions disabled');
  }
}
