import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompleteLandPlotsAndReferenceData1729324800007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // === 1. Fix land_plots: add missing columns ===
    
    // Rename polygonId to polygon_id
    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns 
          WHERE table_name='land_plots' AND column_name='polygonId') THEN
          ALTER TABLE land_plots RENAME COLUMN "polygonId" TO "polygon_id";
        END IF; 
      END $$
    `);

    // Make columns nullable (fix NOT NULL constraints)
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN cadastral_number DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE land_plots DROP CONSTRAINT IF EXISTS land_plots_cadastral_number_key`);
    await queryRunner.query(`ALTER TABLE land_plots ADD CONSTRAINT land_plots_cadastral_number_key UNIQUE NULLS NOT DISTINCT (cadastral_number)`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN area DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN land_category DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN permitted_use DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN address DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN status DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE land_plots ALTER COLUMN registration_date DROP NOT NULL`);

    // Add geodetic fields
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

    // === 2. Fix projects: add status column ===
    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
          WHERE table_name='projects' AND column_name='status') THEN
          ALTER TABLE projects ADD COLUMN status VARCHAR(50) DEFAULT 'draft';
        END IF; 
      END $$
    `);
    await queryRunner.query(`ALTER TABLE projects ALTER COLUMN description TYPE TEXT`);
    await queryRunner.query(`ALTER TABLE projects ALTER COLUMN description DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE projects ALTER COLUMN picture TYPE TEXT`);
    await queryRunner.query(`ALTER TABLE projects ALTER COLUMN picture DROP NOT NULL`);

    // Add status constraint
    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_project_status') THEN
          ALTER TABLE projects ADD CONSTRAINT chk_project_status 
          CHECK (status IN ('draft', 'in_review', 'approved', 'returned'));
        END IF; 
      END $$
    `);

    // === 3. Add geometry column to polygons ===
    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
          WHERE table_name='polygons' AND column_name='geometry') THEN
          ALTER TABLE polygons ADD COLUMN geometry TEXT;
        END IF; 
      END $$
    `);

    // === 4. Create project_documents table ===
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
          REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_project_documents_project ON project_documents (project_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_project_documents_landplot ON project_documents (land_plot_id)`);

    // === 5. Create reference tables ===
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

    // === 6. Create audit_logs table ===
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
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs (user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at)`);

    console.log('✅ Complete schema migration applied');
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

    // Remove geometry from polygons
    await queryRunner.query(`ALTER TABLE polygons DROP COLUMN IF EXISTS geometry`);

    // Rename polygon_id back to polygonId
    await queryRunner.query(`ALTER TABLE land_plots DROP CONSTRAINT IF EXISTS fk_land_plots_polygon`);
    await queryRunner.query(`ALTER TABLE land_plots RENAME COLUMN "polygon_id" TO "polygonId"`);
    await queryRunner.query(`ALTER TABLE land_plots ADD CONSTRAINT fk_land_plots_polygon 
      FOREIGN KEY ("polygonId") REFERENCES polygons(id) ON DELETE SET NULL`);

    console.log('🔄 Complete schema migration rolled back');
  }
}
