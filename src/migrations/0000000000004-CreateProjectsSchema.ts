// src/migrations/0000000000004-CreateProjectsSchema.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectsSchema0000000000004 implements MigrationInterface {
  name = 'CreateProjectsSchema0000000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // === PROJECTS ===
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR NOT NULL,
        "description" TEXT,
        "picture" VARCHAR,
        "owner_id" INTEGER NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "deletedAt" TIMESTAMP
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD CONSTRAINT "fk_projects_owner" 
      FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_projects_owner" ON "projects" ("owner_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_projects_deleted" ON "projects" ("deletedAt") WHERE "deletedAt" IS NOT NULL`,
    );

    // === POLYGONS (с PostGIS геометрией) ===
    await queryRunner.query(`
      CREATE TABLE "polygons" (
        "id" SERIAL PRIMARY KEY,
        "project_id" INTEGER NOT NULL,
        "name" VARCHAR NOT NULL,
        "coordinates" JSONB NOT NULL,
        "geometry" geometry(Polygon, 4326),
        "created_by" INTEGER NOT NULL,
        "updated_by" INTEGER NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMP
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "polygons" 
      ADD CONSTRAINT "fk_polygons_project" 
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "polygons" 
      ADD CONSTRAINT "fk_polygons_created_by" 
      FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "polygons" 
      ADD CONSTRAINT "fk_polygons_updated_by" 
      FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT
    `);

    // 🔥 Пространственный индекс GIST для PostGIS
    await queryRunner.query(`
      CREATE INDEX "idx_polygons_geometry" 
      ON "polygons" USING GIST ("geometry")
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_polygons_project" ON "polygons" ("project_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_polygons_deleted" ON "polygons" ("deleted_at") WHERE "deleted_at" IS NOT NULL`,
    );

    // === LAND_PLOTS ===
    await queryRunner.query(`
      CREATE TABLE "land_plots" (
        "id" SERIAL PRIMARY KEY,
        "cadastral_number" VARCHAR UNIQUE NOT NULL,
        "area" FLOAT NOT NULL,
        "land_category" VARCHAR NOT NULL,
        "permitted_use" VARCHAR NOT NULL,
        "address" TEXT NOT NULL,
        "status" VARCHAR NOT NULL,
        "registration_date" DATE NOT NULL,
        "polygon_id" INTEGER
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "land_plots" 
      ADD CONSTRAINT "fk_land_plots_polygon" 
      FOREIGN KEY ("polygon_id") REFERENCES "polygons"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_land_plots_cadastral" ON "land_plots" ("cadastral_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_land_plots_polygon" ON "land_plots" ("polygon_id")`,
    );

    // === MAP_VIEWS ===
    await queryRunner.query(`
      CREATE TABLE "map_views" (
        "id" SERIAL PRIMARY KEY,
        "project_id" INTEGER NOT NULL,
        "user_id" INTEGER NOT NULL,
        "lat" FLOAT NOT NULL,
        "lon" FLOAT NOT NULL,
        "zoom" INTEGER NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE ("project_id", "user_id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "map_views" 
      ADD CONSTRAINT "fk_map_views_project" 
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "map_views" 
      ADD CONSTRAINT "fk_map_views_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_map_views_project_user" ON "map_views" ("project_id", "user_id")`,
    );

    console.log('✅ Projects & Geo schema created');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "map_views"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "land_plots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "polygons"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "projects"`);

    console.log('🔄 Projects & Geo schema dropped');
  }
}
