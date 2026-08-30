import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthAndUsersSchema0000000000002 implements MigrationInterface {
  name = 'CreateAuthAndUsersSchema0000000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // === USERS ===
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR NOT NULL,
        "email" VARCHAR UNIQUE NOT NULL,
        "password" VARCHAR NOT NULL,
        "isActive" BOOLEAN DEFAULT true,
        "roles" TEXT,
        "avatar" VARCHAR,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "deletedAt" TIMESTAMP
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_users_email" ON "users" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_isActive" ON "users" ("isActive")`,
    );

    // === ROLES ===
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR UNIQUE NOT NULL
      )
    `);

    // === PERMISSIONS ===
    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR UNIQUE NOT NULL
      )
    `);

    // === USER_ROLES (junction) ===
    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "user_id" INTEGER NOT NULL,
        "role_id" INTEGER NOT NULL,
        PRIMARY KEY ("user_id", "role_id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "user_roles" ADD CONSTRAINT "fk_user_roles_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "user_roles" ADD CONSTRAINT "fk_user_roles_role" 
      FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_user_roles_user" ON "user_roles" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_roles_role" ON "user_roles" ("role_id")`,
    );

    // === ROLE_PERMISSIONS (junction) ===
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id" INTEGER NOT NULL,
        "permission_id" INTEGER NOT NULL,
        PRIMARY KEY ("role_id", "permission_id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_role" 
      FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_permission" 
      FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_role_permissions_role" ON "role_permissions" ("role_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_role_permissions_permission" ON "role_permissions" ("permission_id")`,
    );

    // === REFRESH_TOKENS ===
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" SERIAL PRIMARY KEY,
        "token" VARCHAR UNIQUE NOT NULL,
        "userId" INTEGER NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "revoked" BOOLEAN DEFAULT false
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" ADD CONSTRAINT "fk_refresh_tokens_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_tokens_token" ON "refresh_tokens" ("token")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens" ("userId")`,
    );

    console.log('✅ Auth & Users schema created');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    console.log('🔄 Auth & Users schema dropped');
  }
}
