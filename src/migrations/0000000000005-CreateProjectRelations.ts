// src/migrations/0000000000005-CreateProjectRelations.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectRelations0000000000005 implements MigrationInterface {
  name = 'CreateProjectRelations0000000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // === PROJECT_MEMBERS (junction с ролью) ===
    await queryRunner.query(`
      CREATE TABLE "project_members" (
        "project_id" INTEGER NOT NULL,
        "user_id" INTEGER NOT NULL,
        "role_in_project" VARCHAR NOT NULL CHECK ("role_in_project" IN ('viewer', 'editor', 'admin')),
        "joined_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY ("project_id", "user_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "project_members" 
      ADD CONSTRAINT "fk_project_members_project" 
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "project_members" 
      ADD CONSTRAINT "fk_project_members_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_project_members_project" ON "project_members" ("project_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_project_members_user" ON "project_members" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_project_members_role" ON "project_members" ("role_in_project")`,
    );

    console.log('✅ Project relations schema created');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "project_members"`);
    console.log('🔄 Project relations schema dropped');
  }
}
