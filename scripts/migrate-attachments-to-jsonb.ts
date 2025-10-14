import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

/**
 * Migration Script: Convert text[] attachment fields to jsonb format
 * 
 * This script converts attachment fields from text[] to jsonb format for:
 * - messages: attachments
 * - import_shipments: proof_of_delivery, attachments
 * - export_shipments: proof_of_delivery, attachments
 * - custom_clearances: transport_documents, clearance_documents
 * 
 * Each text array element (path string) is converted to {filename, path} object format.
 */

interface TableMigration {
  table: string;
  columns: string[];
}

const TABLES_TO_MIGRATE: TableMigration[] = [
  { table: 'messages', columns: ['attachments'] },
  { table: 'import_shipments', columns: ['proof_of_delivery', 'attachments'] },
  { table: 'export_shipments', columns: ['proof_of_delivery', 'attachments'] },
  { table: 'custom_clearances', columns: ['transport_documents', 'clearance_documents'] }
];

/**
 * Extract filename from a file path
 */
function extractFilename(path: string): string {
  // Remove query parameters
  const pathWithoutQuery = path.split('?')[0];
  // Get last segment of path
  const filename = pathWithoutQuery.split('/').pop() || 'file';
  return filename;
}

/**
 * Check if a column is currently text[] type
 */
async function isTextArrayColumn(table: string, column: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = ${table}
        AND column_name = ${column}
    `;
    
    if (result.length === 0) {
      console.log(`  ⚠️  Column ${column} does not exist in ${table}`);
      return false;
    }
    
    const dataType = result[0].data_type;
    const udtName = result[0].udt_name;
    
    // Check if it's an array type (ARRAY or _text which is text[])
    const isArray = dataType === 'ARRAY' || udtName === '_text' || udtName.startsWith('_');
    
    console.log(`  📋 ${table}.${column}: ${dataType} (${udtName}) - ${isArray ? 'IS' : 'NOT'} array`);
    return isArray;
  } catch (error) {
    console.error(`  ❌ Error checking column type for ${table}.${column}:`, error);
    return false;
  }
}

/**
 * Migrate a single column from text[] to jsonb
 */
async function migrateColumn(table: string, column: string): Promise<void> {
  console.log(`\n  🔄 Migrating ${table}.${column}...`);
  
  try {
    // Step 1: Check if column is text[]
    const isArray = await isTextArrayColumn(table, column);
    if (!isArray) {
      console.log(`  ✅ ${table}.${column} is already jsonb or doesn't need migration`);
      return;
    }
    
    // Step 2: Create temporary column for new jsonb data
    const tempColumn = `${column}_temp`;
    console.log(`  📦 Creating temporary column ${tempColumn}...`);
    
    // Use string interpolation for table/column names (from trusted constants, not user input)
    await sql(
      `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${tempColumn} jsonb DEFAULT '[]'::jsonb`
    );
    
    // Step 3: Convert data from text[] to jsonb format
    console.log(`  🔧 Converting data format...`);
    
    // Get all rows with non-null/non-empty arrays
    // Use string interpolation for table/column names (from trusted constants)
    const rows = await sql(
      `SELECT id, ${column} as old_value
       FROM ${table}
       WHERE ${column} IS NOT NULL
         AND array_length(${column}, 1) > 0`
    );
    
    console.log(`  📊 Found ${rows.length} rows with data to migrate`);
    
    // Update each row, converting text[] paths to {filename, path} objects
    for (const row of rows) {
      const oldPaths: string[] = row.old_value;
      const newObjects = oldPaths.map(path => ({
        filename: extractFilename(path),
        path: path
      }));
      
      // Escape values for SQL
      // Table/column names: string interpolation (from trusted constants)
      // Values: properly escaped and quoted
      const jsonbEscaped = JSON.stringify(newObjects).replace(/'/g, "''");
      const idValue = typeof row.id === 'string' ? `'${row.id.replace(/'/g, "''")}'` : row.id;
      
      await sql(
        `UPDATE ${table}
         SET ${tempColumn} = '${jsonbEscaped}'::jsonb
         WHERE id = ${idValue}`
      );
    }
    
    console.log(`  ✅ Converted ${rows.length} rows`);
    
    // Step 4: Drop old column
    console.log(`  🗑️  Dropping old column...`);
    await sql(`ALTER TABLE ${table} DROP COLUMN IF EXISTS ${column}`);
    
    // Step 5: Rename temp column to original name
    console.log(`  ✏️  Renaming temp column...`);
    await sql(`ALTER TABLE ${table} RENAME COLUMN ${tempColumn} TO ${column}`);
    
    console.log(`  ✅ Successfully migrated ${table}.${column}`);
    
  } catch (error) {
    console.error(`  ❌ Error migrating ${table}.${column}:`, error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration(): Promise<void> {
  console.log('🚀 Starting attachment fields migration...\n');
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  console.log('📌 Database:', process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'unknown');
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const { table, columns } of TABLES_TO_MIGRATE) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Table: ${table}`);
    console.log('='.repeat(60));
    
    for (const column of columns) {
      try {
        await migrateColumn(table, column);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to migrate ${table}.${column}`);
      }
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successful migrations: ${successCount}`);
  console.log(`⚠️  Skipped (already jsonb): ${skipCount}`);
  console.log(`❌ Failed migrations: ${errorCount}`);
  console.log('='.repeat(60));
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some migrations failed. Please review the errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All migrations completed successfully!');
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n✅ Migration script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
