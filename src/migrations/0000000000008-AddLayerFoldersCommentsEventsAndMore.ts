import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLayerFoldersCommentsEventsAndMore1731016200008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // === 1. Add project_id and timestamps to land_plots ===
    await queryRunner.query(
      `ALTER TABLE land_plots ADD COLUMN IF NOT EXISTS project_id INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE land_plots ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`,
    );
    await queryRunner.query(
      `ALTER TABLE land_plots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`,
    );
    await queryRunner.query(
      `ALTER TABLE land_plots ADD CONSTRAINT fk_land_plots_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_land_plots_project ON land_plots (project_id)`,
    );

    // === 2. Create layer_folders table ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS layer_folders (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        type VARCHAR(50) DEFAULT 'folder',
        name VARCHAR(255) NOT NULL,
        parent_id INTEGER,
        layer_id INTEGER,
        order_index INTEGER DEFAULT 0,
        is_visible BOOLEAN DEFAULT true,
        is_collapsed BOOLEAN DEFAULT false,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_layer_folders_project FOREIGN KEY (project_id) 
          REFERENCES projects(id) ON DELETE CASCADE,
        CONSTRAINT fk_layer_folders_parent FOREIGN KEY (parent_id) 
          REFERENCES layer_folders(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_layer_folders_project ON layer_folders (project_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_layer_folders_parent ON layer_folders (parent_id)`,
    );

    // === 3. Create layer_objects table (Figma/Photoshop style) ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS layer_objects (
        id SERIAL PRIMARY KEY,
        layer_folder_id INTEGER NOT NULL,
        polygon_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        object_name VARCHAR(255),
        is_visible BOOLEAN DEFAULT true,
        is_locked BOOLEAN DEFAULT false,
        opacity DOUBLE PRECISION DEFAULT 1.0,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_layer_objects_folder FOREIGN KEY (layer_folder_id) 
          REFERENCES layer_folders(id) ON DELETE CASCADE,
        CONSTRAINT fk_layer_objects_polygon FOREIGN KEY (polygon_id) 
          REFERENCES polygons(id) ON DELETE CASCADE,
        CONSTRAINT fk_layer_objects_user FOREIGN KEY (user_id) 
          REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_layer_objects_folder ON layer_objects (layer_folder_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_layer_objects_polygon ON layer_objects (polygon_id)`,
    );

    // === 4. Create comments table ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        text TEXT NOT NULL,
        status VARCHAR(50),
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolved_by INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_comments_project FOREIGN KEY (project_id) 
          REFERENCES projects(id) ON DELETE CASCADE,
        CONSTRAINT fk_comments_user FOREIGN KEY (user_id) 
          REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_comments_resolved_by FOREIGN KEY (resolved_by) 
          REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_comments_project ON comments (project_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_comments_user ON comments (user_id)`,
    );

    // === 5. Create events table ===
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        type VARCHAR(50) DEFAULT 'note',
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date TIMESTAMP WITH TIME ZONE,
        is_done BOOLEAN DEFAULT false,
        done_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_events_project FOREIGN KEY (project_id) 
          REFERENCES projects(id) ON DELETE CASCADE,
        CONSTRAINT fk_events_user FOREIGN KEY (user_id) 
          REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_events_project ON events (project_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_events_user ON events (user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_events_due_date ON events (due_date)`,
    );

    console.log('✅ Layer folders, comments, events, and land_plots extensions migration applied');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS events`);
    await queryRunner.query(`DROP TABLE IF EXISTS comments`);
    await queryRunner.query(`DROP TABLE IF EXISTS layer_objects`);
    await queryRunner.query(`DROP TABLE IF EXISTS layer_folders`);

    // Remove project_id and timestamps from land_plots
    await queryRunner.query(
      `ALTER TABLE land_plots DROP CONSTRAINT IF EXISTS fk_land_plots_project`,
    );
    await queryRunner.query(
      `ALTER TABLE land_plots DROP COLUMN IF EXISTS project_id`,
    );
    await queryRunner.query(
      `ALTER TABLE land_plots DROP COLUMN IF EXISTS created_at`,
    );
    await queryRunner.query(
      `ALTER TABLE land_plots DROP COLUMN IF EXISTS updated_at`,
    );

    console.log('🔄 Layer folders, comments, events migration rolled back');
  }
}
