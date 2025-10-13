import { db } from "../server/db";
import { customClearances, importShipments, exportShipments, messages, jobFileGroups } from "../shared/schema";
import { sql } from "drizzle-orm";

async function migrateFilesToJsonb() {
  console.log("Starting file migration to JSONB format...");

  try {
    // Helper function to convert string array to JSONB array of objects
    const convertToFileObjects = (files: any[]): any[] => {
      if (!files || files.length === 0) return [];
      return files.map(f => {
        if (typeof f === 'string') {
          const filename = f.split('/').pop() || f;
          return { filename, path: f };
        }
        return f; // Already an object
      });
    };

    // 1. Drop defaults, change types to JSONB, re-add defaults
    console.log("Step 1: Altering column types to JSONB...");
    
    await db.execute(sql`
      ALTER TABLE custom_clearances 
        ALTER COLUMN transport_documents DROP DEFAULT,
        ALTER COLUMN clearance_documents DROP DEFAULT
    `);
    await db.execute(sql`
      ALTER TABLE custom_clearances 
        ALTER COLUMN transport_documents TYPE jsonb USING '[]'::jsonb,
        ALTER COLUMN clearance_documents TYPE jsonb USING '[]'::jsonb
    `);
    
    await db.execute(sql`
      ALTER TABLE import_shipments 
        ALTER COLUMN attachments DROP DEFAULT,
        ALTER COLUMN proof_of_delivery DROP DEFAULT
    `);
    await db.execute(sql`
      ALTER TABLE import_shipments 
        ALTER COLUMN attachments TYPE jsonb USING '[]'::jsonb,
        ALTER COLUMN proof_of_delivery TYPE jsonb USING '[]'::jsonb
    `);
    
    await db.execute(sql`
      ALTER TABLE export_shipments 
        ALTER COLUMN attachments DROP DEFAULT,
        ALTER COLUMN proof_of_delivery DROP DEFAULT,
        ALTER COLUMN transport_documents DROP DEFAULT,
        ALTER COLUMN clearance_documents DROP DEFAULT
    `);
    await db.execute(sql`
      ALTER TABLE export_shipments 
        ALTER COLUMN attachments TYPE jsonb USING '[]'::jsonb,
        ALTER COLUMN proof_of_delivery TYPE jsonb USING '[]'::jsonb,
        ALTER COLUMN transport_documents TYPE jsonb USING '[]'::jsonb,
        ALTER COLUMN clearance_documents TYPE jsonb USING '[]'::jsonb
    `);
    
    await db.execute(sql`
      ALTER TABLE messages 
        ALTER COLUMN attachments DROP DEFAULT
    `);
    await db.execute(sql`
      ALTER TABLE messages 
        ALTER COLUMN attachments TYPE jsonb USING '[]'::jsonb
    `);
    
    await db.execute(sql`
      ALTER TABLE job_file_groups 
        ALTER COLUMN documents DROP DEFAULT,
        ALTER COLUMN rs_invoices DROP DEFAULT
    `);
    await db.execute(sql`
      ALTER TABLE job_file_groups 
        ALTER COLUMN documents TYPE jsonb USING '[]'::jsonb,
        ALTER COLUMN rs_invoices TYPE jsonb USING '[]'::jsonb
    `);

    console.log("✓ Column types updated to JSONB");
    
    console.log("\nMigration completed successfully!");
    
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateFilesToJsonb();
