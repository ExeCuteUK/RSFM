import { db } from "../server/db";
import { 
  importCustomers, 
  exportCustomers, 
  exportReceivers, 
  hauliers, 
  shippingLines, 
  clearanceAgents 
} from "../shared/schema";
import { writeFileSync } from "fs";
import { mkdirSync } from "fs";

async function backupContactDatabases() {
  try {
    mkdirSync("backups", { recursive: true });

    console.log("Starting backup of contact databases...");

    // Backup Import Customers
    console.log("Backing up Import Customers...");
    const importCustomersData = await db.select().from(importCustomers);
    const importCustomersSQL = generateInsertSQL("import_customers", importCustomersData);
    writeFileSync("backups/import_customers_backup.sql", importCustomersSQL);
    console.log(`✓ Import Customers backed up: ${importCustomersData.length} records`);

    // Backup Export Customers
    console.log("Backing up Export Customers...");
    const exportCustomersData = await db.select().from(exportCustomers);
    const exportCustomersSQL = generateInsertSQL("export_customers", exportCustomersData);
    writeFileSync("backups/export_customers_backup.sql", exportCustomersSQL);
    console.log(`✓ Export Customers backed up: ${exportCustomersData.length} records`);

    // Backup Export Receivers
    console.log("Backing up Export Receivers...");
    const exportReceiversData = await db.select().from(exportReceivers);
    const exportReceiversSQL = generateInsertSQL("export_receivers", exportReceiversData);
    writeFileSync("backups/export_receivers_backup.sql", exportReceiversSQL);
    console.log(`✓ Export Receivers backed up: ${exportReceiversData.length} records`);

    // Backup Hauliers
    console.log("Backing up Hauliers...");
    const hauliersData = await db.select().from(hauliers);
    const hauliersSQL = generateInsertSQL("hauliers", hauliersData);
    writeFileSync("backups/hauliers_backup.sql", hauliersSQL);
    console.log(`✓ Hauliers backed up: ${hauliersData.length} records`);

    // Backup Shipping Lines
    console.log("Backing up Shipping Lines...");
    const shippingLinesData = await db.select().from(shippingLines);
    const shippingLinesSQL = generateInsertSQL("shipping_lines", shippingLinesData);
    writeFileSync("backups/shipping_lines_backup.sql", shippingLinesSQL);
    console.log(`✓ Shipping Lines backed up: ${shippingLinesData.length} records`);

    // Backup Clearance Agents
    console.log("Backing up Clearance Agents...");
    const clearanceAgentsData = await db.select().from(clearanceAgents);
    const clearanceAgentsSQL = generateInsertSQL("clearance_agents", clearanceAgentsData);
    writeFileSync("backups/clearance_agents_backup.sql", clearanceAgentsSQL);
    console.log(`✓ Clearance Agents backed up: ${clearanceAgentsData.length} records`);

    // Create a restore script
    const restoreScript = `-- Contact Databases Restore Script
-- Generated: ${new Date().toISOString()}
-- This script will restore all contact databases
-- WARNING: This will DELETE all existing data in these tables!

BEGIN;

-- Clear existing data
DELETE FROM clearance_agents;
DELETE FROM shipping_lines;
DELETE FROM hauliers;
DELETE FROM export_receivers;
DELETE FROM export_customers;
DELETE FROM import_customers;

-- Import backups (run each file in order)
\\i import_customers_backup.sql
\\i export_customers_backup.sql
\\i export_receivers_backup.sql
\\i hauliers_backup.sql
\\i shipping_lines_backup.sql
\\i clearance_agents_backup.sql

COMMIT;

-- Verify counts
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
SELECT 'clearance_agents', COUNT(*) FROM clearance_agents;
`;

    writeFileSync("backups/restore_all.sql", restoreScript);
    console.log("\n✓ All contact databases backed up successfully!");
    console.log("\nBackup files created:");
    console.log("  - backups/import_customers_backup.sql");
    console.log("  - backups/export_customers_backup.sql");
    console.log("  - backups/export_receivers_backup.sql");
    console.log("  - backups/hauliers_backup.sql");
    console.log("  - backups/shipping_lines_backup.sql");
    console.log("  - backups/clearance_agents_backup.sql");
    console.log("  - backups/restore_all.sql (master restore script)");

    process.exit(0);
  } catch (error) {
    console.error("Error backing up databases:", error);
    process.exit(1);
  }
}

function generateInsertSQL(tableName: string, data: any[]): string {
  if (data.length === 0) {
    return `-- No data to backup for ${tableName}\n`;
  }

  const columns = Object.keys(data[0]);
  let sql = `-- Backup for ${tableName}\n`;
  sql += `-- ${data.length} records\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n\n`;

  for (const row of data) {
    const values = columns.map(col => {
      const value = row[col];
      
      if (value === null || value === undefined) {
        return "NULL";
      }
      
      if (typeof value === "string") {
        return `'${value.replace(/'/g, "''")}'`;
      }
      
      if (typeof value === "boolean") {
        return value ? "TRUE" : "FALSE";
      }
      
      if (Array.isArray(value)) {
        const arrayValues = value.map(v => 
          typeof v === "string" ? `"${v.replace(/"/g, '\\"')}"` : String(v)
        ).join(",");
        return `ARRAY[${arrayValues}]`;
      }
      
      if (typeof value === "object") {
        return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
      }
      
      return String(value);
    });

    sql += `INSERT INTO ${tableName} (${columns.map(c => `"${c}"`).join(", ")}) VALUES (${values.join(", ")});\n`;
  }

  sql += "\n";
  return sql;
}

backupContactDatabases();
