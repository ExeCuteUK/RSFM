// Migration script to fix invoice_charge_templates table schema
// Changes ID column from integer to varchar to support UUIDs

// Load environment variables from .env file FIRST (for Ubuntu server)
import dotenv from 'dotenv';
dotenv.config();

import { sql } from 'drizzle-orm';
import { db } from '../server/db';

async function migrateInvoiceTemplates() {
  console.log('🔧 Starting invoice_charge_templates migration...');
  console.log('');

  try {
    // Check if table exists and get current schema
    const tableCheck = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invoice_charge_templates' 
      AND column_name = 'id'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('⚠️  Table invoice_charge_templates does not exist.');
      console.log('✅ Running npm run db:push to create it with correct schema...');
      console.log('');
      process.exit(0);
    }

    const currentType = tableCheck.rows[0].data_type;
    console.log(`Current ID column type: ${currentType}`);

    if (currentType === 'character varying' || currentType === 'varchar') {
      console.log('✅ Schema is already correct! No migration needed.');
      console.log('');
      process.exit(0);
    }

    // Check if table has any data
    const countResult = await db.execute(sql`SELECT COUNT(*) FROM invoice_charge_templates`);
    const recordCount = parseInt(countResult.rows[0].count as string);
    
    console.log(`Found ${recordCount} records in table`);
    
    if (recordCount > 0) {
      console.log('⚠️  WARNING: Table contains data. This migration will DELETE all records.');
      console.log('Please backup your data before proceeding.');
      console.log('');
      process.exit(1);
    }

    console.log('');
    console.log('📝 Dropping old table...');
    await db.execute(sql`DROP TABLE invoice_charge_templates CASCADE`);
    console.log('✅ Old table dropped');

    console.log('');
    console.log('📝 Creating new table with varchar ID...');
    await db.execute(sql`
      CREATE TABLE invoice_charge_templates (
        id VARCHAR PRIMARY KEY,
        template_name VARCHAR NOT NULL,
        charges JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ New table created');

    console.log('');
    console.log('✅ Migration completed successfully!');
    console.log('The invoice_charge_templates table now accepts UUID strings.');
    console.log('');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('');
    console.log('If you see permission errors, make sure you are running this as the database owner.');
    console.log('If the issue persists, you can manually run this SQL:');
    console.log('');
    console.log('DROP TABLE invoice_charge_templates CASCADE;');
    console.log('CREATE TABLE invoice_charge_templates (');
    console.log('  id VARCHAR PRIMARY KEY,');
    console.log('  template_name VARCHAR NOT NULL,');
    console.log('  charges JSONB NOT NULL,');
    console.log('  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    console.log(');');
    console.log('');
    process.exit(1);
  }

  process.exit(0);
}

migrateInvoiceTemplates();
