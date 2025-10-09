import { db } from "../server/db";
import { readFileSync } from "fs";
import { sql } from "drizzle-orm";

async function restoreContactDatabases() {
  try {
    // Get backup name and optional tables list from command line arguments
    const backupName = process.argv[2];
    const tablesJson = process.argv[3];
    
    if (!backupName) {
      console.error("Error: Backup name is required");
      console.log("Usage: tsx scripts/restore-contact-databases.ts <backup_name> [tables_json]");
      process.exit(1);
    }

    const backupDir = `backups/${backupName}`;
    
    // Parse selected tables if provided
    let selectedTables: string[] = [];
    if (tablesJson) {
      try {
        selectedTables = JSON.parse(tablesJson);
      } catch (error) {
        console.error("Error: Invalid tables JSON");
        process.exit(1);
      }
    }
    
    console.log(`Starting restore of database tables from: ${backupName}`);
    if (selectedTables.length > 0) {
      console.log(`Selected tables: ${selectedTables.join(", ")}`);
    }
    console.log("WARNING: This will DELETE all existing data in selected tables!");
    
    // All available tables organized by category (in dependency order for deletion)
    const allTables = [
      // Jobs (must be deleted first due to foreign key constraints)
      { name: "custom_clearances", file: `${backupDir}/custom_clearances_backup.sql`, category: "Jobs" },
      { name: "import_shipments", file: `${backupDir}/import_shipments_backup.sql`, category: "Jobs" },
      { name: "export_shipments", file: `${backupDir}/export_shipments_backup.sql`, category: "Jobs" },
      { name: "job_file_groups", file: `${backupDir}/job_file_groups_backup.sql`, category: "Jobs" },
      { name: "messages", file: `${backupDir}/messages_backup.sql`, category: "Jobs" },
      
      // Financial
      { name: "invoices", file: `${backupDir}/invoices_backup.sql`, category: "Financial" },
      { name: "purchase_invoices", file: `${backupDir}/purchase_invoices_backup.sql`, category: "Financial" },
      
      // Contacts
      { name: "clearance_agents", file: `${backupDir}/clearance_agents_backup.sql`, category: "Contacts" },
      { name: "shipping_lines", file: `${backupDir}/shipping_lines_backup.sql`, category: "Contacts" },
      { name: "hauliers", file: `${backupDir}/hauliers_backup.sql`, category: "Contacts" },
      { name: "export_receivers", file: `${backupDir}/export_receivers_backup.sql`, category: "Contacts" },
      { name: "export_customers", file: `${backupDir}/export_customers_backup.sql`, category: "Contacts" },
      { name: "import_customers", file: `${backupDir}/import_customers_backup.sql`, category: "Contacts" },
      
      // System Data
      { name: "general_references", file: `${backupDir}/general_references_backup.sql`, category: "System Data" },
      { name: "settings", file: `${backupDir}/settings_backup.sql`, category: "System Data" },
      { name: "users", file: `${backupDir}/users_backup.sql`, category: "System Data" },
    ];

    // Filter tables based on selection (if provided)
    const tables = selectedTables.length > 0
      ? allTables.filter(t => selectedTables.includes(t.name))
      : allTables;

    if (tables.length === 0) {
      console.error("Error: No valid tables selected");
      process.exit(1);
    }

    // Clear existing data only for selected tables
    console.log("\nClearing existing data for selected tables...");
    for (const table of tables) {
      await db.execute(sql.raw(`DELETE FROM ${table.name}`));
      console.log(`✓ Cleared ${table.name}`);
    }

    // Restore each table
    console.log("\nRestoring data...");
    for (const table of tables) {
      try {
        const sqlContent = readFileSync(table.file, "utf-8");
        
        // Split by lines and filter out comments and empty lines
        const statements = sqlContent
          .split("\n")
          .filter(line => line.trim() && !line.trim().startsWith("--"))
          .join("\n")
          .split(";")
          .filter(stmt => stmt.trim());

        for (const statement of statements) {
          if (statement.trim()) {
            await db.execute(sql.raw(statement));
          }
        }
        
        const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table.name}`));
        console.log(`✓ ${table.name} restored: ${result.rows[0].count} records`);
      } catch (error) {
        console.error(`Error restoring ${table.name}:`, error);
        throw error;
      }
    }

    console.log("\n✓ Selected tables restored successfully!");
    
    // Verify final counts for restored tables
    console.log("\nFinal counts:");
    for (const table of tables) {
      const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table.name}`));
      console.log(`  ${table.name}: ${result.rows[0].count} records`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error restoring databases:", error);
    process.exit(1);
  }
}

restoreContactDatabases();
