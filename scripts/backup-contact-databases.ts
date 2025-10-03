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
    // Create timestamped backup directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupDir = `backups/backup_${timestamp}`;
    mkdirSync(backupDir, { recursive: true });

    console.log(`Starting backup of contact databases...`);
    console.log(`Backup directory: ${backupDir}`);

    // Backup Import Customers
    console.log("Backing up Import Customers...");
    const importCustomersData = await db.select().from(importCustomers);
    const importCustomersSQL = generateInsertSQL("import_customers", importCustomersData);
    writeFileSync(`${backupDir}/import_customers_backup.sql`, importCustomersSQL);
    console.log(`✓ Import Customers backed up: ${importCustomersData.length} records`);

    // Backup Export Customers
    console.log("Backing up Export Customers...");
    const exportCustomersData = await db.select().from(exportCustomers);
    const exportCustomersSQL = generateInsertSQL("export_customers", exportCustomersData);
    writeFileSync(`${backupDir}/export_customers_backup.sql`, exportCustomersSQL);
    console.log(`✓ Export Customers backed up: ${exportCustomersData.length} records`);

    // Backup Export Receivers
    console.log("Backing up Export Receivers...");
    const exportReceiversData = await db.select().from(exportReceivers);
    const exportReceiversSQL = generateInsertSQL("export_receivers", exportReceiversData);
    writeFileSync(`${backupDir}/export_receivers_backup.sql`, exportReceiversSQL);
    console.log(`✓ Export Receivers backed up: ${exportReceiversData.length} records`);

    // Backup Hauliers
    console.log("Backing up Hauliers...");
    const hauliersData = await db.select().from(hauliers);
    const hauliersSQL = generateInsertSQL("hauliers", hauliersData);
    writeFileSync(`${backupDir}/hauliers_backup.sql`, hauliersSQL);
    console.log(`✓ Hauliers backed up: ${hauliersData.length} records`);

    // Backup Shipping Lines
    console.log("Backing up Shipping Lines...");
    const shippingLinesData = await db.select().from(shippingLines);
    const shippingLinesSQL = generateInsertSQL("shipping_lines", shippingLinesData);
    writeFileSync(`${backupDir}/shipping_lines_backup.sql`, shippingLinesSQL);
    console.log(`✓ Shipping Lines backed up: ${shippingLinesData.length} records`);

    // Backup Clearance Agents
    console.log("Backing up Clearance Agents...");
    const clearanceAgentsData = await db.select().from(clearanceAgents);
    const clearanceAgentsSQL = generateInsertSQL("clearance_agents", clearanceAgentsData);
    writeFileSync(`${backupDir}/clearance_agents_backup.sql`, clearanceAgentsSQL);
    console.log(`✓ Clearance Agents backed up: ${clearanceAgentsData.length} records`);

    // Create metadata file
    const metadata = {
      timestamp: new Date().toISOString(),
      backupName: `backup_${timestamp}`,
      tables: [
        { name: "import_customers", count: importCustomersData.length },
        { name: "export_customers", count: exportCustomersData.length },
        { name: "export_receivers", count: exportReceiversData.length },
        { name: "hauliers", count: hauliersData.length },
        { name: "shipping_lines", count: shippingLinesData.length },
        { name: "clearance_agents", count: clearanceAgentsData.length },
      ],
      totalRecords: importCustomersData.length + exportCustomersData.length + 
                    exportReceiversData.length + hauliersData.length + 
                    shippingLinesData.length + clearanceAgentsData.length,
    };
    
    writeFileSync(`${backupDir}/metadata.json`, JSON.stringify(metadata, null, 2));

    console.log("\n✓ All contact databases backed up successfully!");
    console.log(`\nBackup name: backup_${timestamp}`);
    console.log(`Total records: ${metadata.totalRecords}`);

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
