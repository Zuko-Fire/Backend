import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateNewTables1729324800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // === 1. Add status column to projects ===
    await queryRunner.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft'`);
    await queryRunner.query(`ALTER TABLE projects ALTER COLUMN description TYPE TEXT`);
    await queryRunner.query(`ALTER TABLE projects ALTER COLUMN description DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE projects ALTER COLUMN picture TYPE TEXT`);
    await queryRunner.query(`ALTER TABLE projects ALTER COLUMN picture DROP NOT NULL`);

    // Add check constraint for status
    await queryRunner.query(`
      ALTER TABLE projects ADD CONSTRAINT chk_project_status 
      CHECK (status IN ('draft', 'in_review', 'approved', 'returned'))
    `);

    // === 2. Create project_documents table ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS project_documents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'other',
        file_path VARCHAR(500) NOT NULL,
        file_size BIGINT,
        mime_type VARCHAR(100),
        project_id INTEGER,
        land_plot_id INTEGER,
        uploaded_by INTEGER NOT NULL,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        description TEXT,
        CONSTRAINT fk_project_documents_project FOREIGN KEY (project_id) 
          REFERENCES projects(id) ON DELETE CASCADE,
        CONSTRAINT fk_project_documents_landplot FOREIGN KEY (land_plot_id) 
          REFERENCES land_plots(id) ON DELETE SET NULL,
        CONSTRAINT fk_project_documents_user FOREIGN KEY (uploaded_by) 
          REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT chk_document_type CHECK (type IN ('assignment', 'right_document', 'extract_egrp', 
          'boundary_agreement', 'survey_data', 'photo', 'other'))
      )
    `);

    await queryRunner.createIndex(
      'project_documents',
      new TableIndex({
        name: 'idx_project_documents_project',
        columnNames: ['project_id'],
      })
    );

    await queryRunner.createIndex(
      'project_documents',
      new TableIndex({
        name: 'idx_project_documents_landplot',
        columnNames: ['land_plot_id'],
      })
    );

    // === 3. Add geodetic fields to land_plots ===
    await queryRunner.query(`ALTER TABLE land_plots ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE land_plots ADD COLUMN IF NOT EXISTS cadastral_cost DOUBLE PRECISION`);
    await queryRunner.query(`ALTER TABLE land_plots ADD COLUMN IF NOT EXISTS coordinate_system VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE land_plots ADD COLUMN IF NOT EXISTS coordinates_data JSONB`);
    await queryRunner.query(`ALTER TABLE land_plots ADD COLUMN IF NOT EXISTS measurement_method VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE land_plots ADD COLUMN IF NOT EXISTS accuracy_mt DOUBLE PRECISION`);
    await queryRunner.query(`ALTER TABLE land_plots ADD COLUMN IF NOT EXISTS boundary_marker_type VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE land_plots ADD COLUMN IF NOT EXISTS adjacent_users JSONB`);
    await queryRunner.query(`ALTER TABLE land_plots ADD COLUMN IF NOT EXISTS boundary_agreement_act JSONB`);
    await queryRunner.query(`ALTER TABLE land_plots ADD COLUMN IF NOT EXISTS boundary_description TEXT`);

    // Make existing required fields nullable
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN cadastral_number DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN cadastral_number DROP CONSTRAINT land_plots_cadastral_number_key`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN cadastral_number ADD CONSTRAINT land_plots_cadastral_number_key UNIQUE NULLS NOT DISTINCT`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN area DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN land_category DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN permitted_use DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN address DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN status DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN registration_date DROP NOT NULL`);

    // === 4. Create reference_land_categories table ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reference_land_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        code VARCHAR(50) UNIQUE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // === 5. Create reference_permitted_uses table ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reference_permitted_uses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        land_category_id INTEGER,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_permitted_uses_category FOREIGN KEY (land_category_id) 
          REFERENCES reference_land_categories(id) ON DELETE SET NULL
      )
    `);

    // === 6. Create reference_boundary_marker_types table ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reference_boundary_marker_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        material_requirements TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // === 7. Create reference_precision_standards table ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reference_precision_standards (
        id SERIAL PRIMARY KEY,
        land_category VARCHAR(255) NOT NULL,
        max_accuracy_mt DOUBLE PRECISION NOT NULL,
        allowed_area_deviation DOUBLE PRECISION NOT NULL,
        allowed_perimeter_deviation DOUBLE PRECISION NOT NULL,
        allowed_point_deviation DOUBLE PRECISION NOT NULL,
        note TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // === 8. Create audit_logs table ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id INTEGER,
        description TEXT,
        changes JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) 
          REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'idx_audit_logs_user',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'idx_audit_logs_entity',
        columnNames: ['entity_type', 'entity_id'],
      })
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'idx_audit_logs_created_at',
        columnNames: ['created_at'],
      })
    );

    // === 9. Add geometry column to polygons (if not exists) ===
    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
          WHERE table_name='polygons' AND column_name='geometry') THEN
          ALTER TABLE polygons ADD COLUMN geometry TEXT;
        END IF; 
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS reference_precision_standards`);
    await queryRunner.query(`DROP TABLE IF EXISTS reference_boundary_marker_types`);
    await queryRunner.query(`DROP TABLE IF EXISTS reference_permitted_uses`);
    await queryRunner.query(`DROP TABLE IF EXISTS reference_land_categories`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_documents`);

    // Remove geodetic columns from land_plots
    const columns = [
      'boundary_description', 'boundary_agreement_act', 'adjacent_users',
      'boundary_marker_type', 'accuracy_mt', 'measurement_method',
      'coordinates_data', 'coordinate_system', 'cadastral_cost', 'owner_name'
    ];
    for (const col of columns) {
      await queryRunner.query(`ALTER TABLE land_plots DROP COLUMN IF EXISTS ${col}`);
    }

    // Remove status from projects
    await queryRunner.query(`ALTER TABLE projects DROP CONSTRAINT IF EXISTS chk_project_status`);
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN IF EXISTS status`);

    // Restore NOT NULL constraints
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN cadastral_number SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN cadastral_number DROP CONSTRAINT land_plots_cadastral_number_key`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN cadastral_number ADD CONSTRAINT land_plots_cadastral_number_key UNIQUE`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN area SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN land_category SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN permitted_use SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN address SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN status SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN registration_date SET NOT NULL`);
  }
}
