import { db } from "../server/db";
import { readFileSync } from "fs";
import { sql } from "drizzle-orm";

async function restoreContactDatabases() {
  try {
    // Get backup name from command line argument
    const backupName = process.argv[2];
    
    if (!backupName) {
      console.error("Error: Backup name is required");
      console.log("Usage: tsx scripts/restore-contact-databases.ts <backup_name>");
      process.exit(1);
    }

    const backupDir = `backups/${backupName}`;
    
    console.log(`Starting restore of contact databases from: ${backupName}`);
    console.log("WARNING: This will DELETE all existing data in contact tables!");
    
    // Read and execute each backup file
    const tables = [
      { name: "import_customers", file: `${backupDir}/import_customers_backup.sql` },
      { name: "export_customers", file: `${backupDir}/export_customers_backup.sql` },
      { name: "export_receivers", file: `${backupDir}/export_receivers_backup.sql` },
      { name: "hauliers", file: `${backupDir}/hauliers_backup.sql` },
      { name: "shipping_lines", file: `${backupDir}/shipping_lines_backup.sql` },
      { name: "clearance_agents", file: `${backupDir}/clearance_agents_backup.sql` },
    ];

    // Clear existing data
    console.log("\nClearing existing data...");
    await db.execute(sql`DELETE FROM clearance_agents`);
    await db.execute(sql`DELETE FROM shipping_lines`);
    await db.execute(sql`DELETE FROM hauliers`);
    await db.execute(sql`DELETE FROM export_receivers`);
    await db.execute(sql`DELETE FROM export_customers`);
    await db.execute(sql`DELETE FROM import_customers`);
    console.log("✓ Existing data cleared");

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

    console.log("\n✓ All contact databases restored successfully!");
    
    // Verify final counts
    console.log("\nFinal counts:");
    const counts = await db.execute(sql`
      SELECT 'import_customers' as table_name, COUNT(*) as record_count FROM import_customers
      UNION ALL
      SELECT 'export_customers', COUNT(*) FROM export_customers
      UNION ALL
      SELECT 'export_receivers', COUNT(*) FROM export_receivers
      UNION ALL
      SELECT 'hauliers', COUNT(*) FROM hauliers
      UNION ALL
      SELECT 'shipping_lines', COUNT(*) FROM shipping_lines
      UNION ALL
      SELECT 'clearance_agents', COUNT(*) FROM clearance_agents
    `);
    
    counts.rows.forEach((row: any) => {
      console.log(`  ${row.table_name}: ${row.record_count} records`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Error restoring databases:", error);
    process.exit(1);
  }
}

restoreContactDatabases();
