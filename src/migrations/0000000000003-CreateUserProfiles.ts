// src/migrations/0000000000003-CreateUserProfiles.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserProfiles0000000000003 implements MigrationInterface {
  name = 'CreateUserProfiles0000000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // === CERTIFICATES ===
    await queryRunner.query(`
      CREATE TABLE "certificates" (
        "id" SERIAL PRIMARY KEY,
        "number" VARCHAR UNIQUE NOT NULL,
        "issue_date" DATE NOT NULL,
        "expiry_date" DATE NOT NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_certificates_number" ON "certificates" ("number")`,
    );

    // === CLIENTS ===
    await queryRunner.query(`
      CREATE TABLE "clients" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER UNIQUE NOT NULL,
        "full_name" VARCHAR NOT NULL,
        "phone" VARCHAR NOT NULL,
        "company_name" VARCHAR
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "clients" 
      ADD CONSTRAINT "fk_clients_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_clients_user" ON "clients" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_clients_phone" ON "clients" ("phone")`,
    );

    // === EMPLOYEES ===
    await queryRunner.query(`
      CREATE TABLE "employees" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER UNIQUE NOT NULL,
        "full_name" VARCHAR NOT NULL,
        "position" VARCHAR NOT NULL
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "employees" 
      ADD CONSTRAINT "fk_employees_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_employees_user" ON "employees" ("user_id")`,
    );

    // === DOCUMENTS ===
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" SERIAL PRIMARY KEY,
        "employee_id" INTEGER UNIQUE NOT NULL,
        "tax_id" VARCHAR NOT NULL,
        "passport_data" TEXT NOT NULL,
        "certificate_id" INTEGER NOT NULL
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "documents" 
      ADD CONSTRAINT "fk_documents_employee" 
      FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "documents" 
      ADD CONSTRAINT "fk_documents_certificate" 
      FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id")
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_documents_employee" ON "documents" ("employee_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_documents_tax_id" ON "documents" ("tax_id")`,
    );

    console.log('✅ User profiles schema created');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "employees"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "clients"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "certificates"`);

    console.log('🔄 User profiles schema dropped');
  }
}
