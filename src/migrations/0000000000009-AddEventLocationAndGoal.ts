import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventLocationAndGoal1731019800009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add goal field
    await queryRunner.query(
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS goal TEXT`,
    );

    // Add event date and time
    await queryRunner.query(
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS event_date DATE`,
    );
    await queryRunner.query(
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS event_time TIME`,
    );

    // Add location fields
    await queryRunner.query(
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS location_name VARCHAR(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION`,
    );
    await queryRunner.query(
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION`,
    );
    await queryRunner.query(
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS location_address TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS location_coordinates JSONB`,
    );

    // Rename is_done to is_done (already exists)
    // Rename done_at to done_at (already exists)

    // Add meeting and field_work event types constraint
    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_event_type') THEN
          ALTER TABLE events ADD CONSTRAINT chk_event_type 
          CHECK (type IN ('note', 'deadline', 'milestone', 'warning', 'meeting', 'field_work'));
        END IF; 
      END $$
    `);

    console.log('✅ Event location and goal migration applied');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE events DROP COLUMN IF EXISTS goal`);
    await queryRunner.query(`ALTER TABLE events DROP COLUMN IF EXISTS event_date`);
    await queryRunner.query(`ALTER TABLE events DROP COLUMN IF EXISTS event_time`);
    await queryRunner.query(`ALTER TABLE events DROP COLUMN IF EXISTS location_name`);
    await queryRunner.query(`ALTER TABLE events DROP COLUMN IF EXISTS location_lat`);
    await queryRunner.query(`ALTER TABLE events DROP COLUMN IF EXISTS location_lng`);
    await queryRunner.query(`ALTER TABLE events DROP COLUMN IF EXISTS location_address`);
    await queryRunner.query(`ALTER TABLE events DROP COLUMN IF EXISTS location_coordinates`);
    await queryRunner.query(`ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_event_type`);

    console.log('🔄 Event location and goal migration rolled back');
  }
}
