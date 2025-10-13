import { db } from "../server/db";
import { 
  importCustomers, 
  exportCustomers, 
  exportReceivers, 
  hauliers, 
  shippingLines, 
  clearanceAgents,
  importShipments,
  exportShipments,
  customClearances,
  jobFileGroups,
  messages,
  emailContacts,
  purchaseInvoices,
  invoices,
  generalReferences,
  settings,
  users
} from "../shared/schema";
import { writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync } from "fs";
import archiver from "archiver";
import { createWriteStream } from "fs";
import { GoogleDriveStorageService } from "../server/googleDriveStorage";
import { readFileSync } from "fs";
import path from "path";

async function backupContactDatabases() {
  try {
    // Create timestamped backup directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupDir = `backups/backup_${timestamp}`;
    mkdirSync(backupDir, { recursive: true });

    console.log(`Starting backup of all database tables...`);
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

    // Backup Import Shipments
    console.log("Backing up Import Shipments...");
    const importShipmentsData = await db.select().from(importShipments);
    const importShipmentsSQL = generateInsertSQL("import_shipments", importShipmentsData);
    writeFileSync(`${backupDir}/import_shipments_backup.sql`, importShipmentsSQL);
    console.log(`✓ Import Shipments backed up: ${importShipmentsData.length} records`);

    // Backup Export Shipments
    console.log("Backing up Export Shipments...");
    const exportShipmentsData = await db.select().from(exportShipments);
    const exportShipmentsSQL = generateInsertSQL("export_shipments", exportShipmentsData);
    writeFileSync(`${backupDir}/export_shipments_backup.sql`, exportShipmentsSQL);
    console.log(`✓ Export Shipments backed up: ${exportShipmentsData.length} records`);

    // Backup Custom Clearances
    console.log("Backing up Custom Clearances...");
    const customClearancesData = await db.select().from(customClearances);
    const customClearancesSQL = generateInsertSQL("custom_clearances", customClearancesData);
    writeFileSync(`${backupDir}/custom_clearances_backup.sql`, customClearancesSQL);
    console.log(`✓ Custom Clearances backed up: ${customClearancesData.length} records`);

    // Backup Job File Groups
    console.log("Backing up Job File Groups...");
    const jobFileGroupsData = await db.select().from(jobFileGroups);
    const jobFileGroupsSQL = generateInsertSQL("job_file_groups", jobFileGroupsData);
    writeFileSync(`${backupDir}/job_file_groups_backup.sql`, jobFileGroupsSQL);
    console.log(`✓ Job File Groups backed up: ${jobFileGroupsData.length} records`);

    // Backup Messages
    console.log("Backing up Messages...");
    const messagesData = await db.select().from(messages);
    const messagesSQL = generateInsertSQL("messages", messagesData);
    writeFileSync(`${backupDir}/messages_backup.sql`, messagesSQL);
    console.log(`✓ Messages backed up: ${messagesData.length} records`);

    // Backup Email Contacts
    console.log("Backing up Email Contacts...");
    const emailContactsData = await db.select().from(emailContacts);
    const emailContactsSQL = generateInsertSQL("email_contacts", emailContactsData);
    writeFileSync(`${backupDir}/email_contacts_backup.sql`, emailContactsSQL);
    console.log(`✓ Email Contacts backed up: ${emailContactsData.length} records`);

    // Backup Purchase Invoices
    console.log("Backing up Purchase Invoices...");
    const purchaseInvoicesData = await db.select().from(purchaseInvoices);
    const purchaseInvoicesSQL = generateInsertSQL("purchase_invoices", purchaseInvoicesData);
    writeFileSync(`${backupDir}/purchase_invoices_backup.sql`, purchaseInvoicesSQL);
    console.log(`✓ Purchase Invoices backed up: ${purchaseInvoicesData.length} records`);

    // Backup Invoices
    console.log("Backing up Invoices...");
    const invoicesData = await db.select().from(invoices);
    const invoicesSQL = generateInsertSQL("invoices", invoicesData);
    writeFileSync(`${backupDir}/invoices_backup.sql`, invoicesSQL);
    console.log(`✓ Invoices backed up: ${invoicesData.length} records`);

    // Backup General References
    console.log("Backing up General References...");
    const generalReferencesData = await db.select().from(generalReferences);
    const generalReferencesSQL = generateInsertSQL("general_references", generalReferencesData);
    writeFileSync(`${backupDir}/general_references_backup.sql`, generalReferencesSQL);
    console.log(`✓ General References backed up: ${generalReferencesData.length} records`);

    // Backup Settings
    console.log("Backing up Settings...");
    const settingsData = await db.select().from(settings);
    const settingsSQL = generateInsertSQL("settings", settingsData);
    writeFileSync(`${backupDir}/settings_backup.sql`, settingsSQL);
    console.log(`✓ Settings backed up: ${settingsData.length} records`);

    // Backup Users
    console.log("Backing up Users...");
    const usersData = await db.select().from(users);
    const usersSQL = generateInsertSQL("users", usersData);
    writeFileSync(`${backupDir}/users_backup.sql`, usersSQL);
    console.log(`✓ Users backed up: ${usersData.length} records`);

    // Create metadata file
    const totalRecords = importCustomersData.length + exportCustomersData.length + 
                         exportReceiversData.length + hauliersData.length + 
                         shippingLinesData.length + clearanceAgentsData.length +
                         importShipmentsData.length + exportShipmentsData.length +
                         customClearancesData.length + jobFileGroupsData.length +
                         messagesData.length + emailContactsData.length + 
                         purchaseInvoicesData.length + invoicesData.length + 
                         generalReferencesData.length + settingsData.length + usersData.length;
    
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
        { name: "import_shipments", count: importShipmentsData.length },
        { name: "export_shipments", count: exportShipmentsData.length },
        { name: "custom_clearances", count: customClearancesData.length },
        { name: "job_file_groups", count: jobFileGroupsData.length },
        { name: "messages", count: messagesData.length },
        { name: "email_contacts", count: emailContactsData.length },
        { name: "purchase_invoices", count: purchaseInvoicesData.length },
        { name: "invoices", count: invoicesData.length },
        { name: "general_references", count: generalReferencesData.length },
        { name: "settings", count: settingsData.length },
        { name: "users", count: usersData.length },
      ],
      totalRecords,
    };
    
    writeFileSync(`${backupDir}/metadata.json`, JSON.stringify(metadata, null, 2));

    console.log("\n✓ All SQL files generated successfully!");
    
    // Backup email signature files
    console.log("\nBacking up email signature files...");
    const signatureTemplatePath = path.join(process.cwd(), "attached_assets", "signature-template.html");
    const signatureLogoPath = path.join(process.cwd(), "attached_assets", "rs-logo.jpg");
    
    if (existsSync(signatureTemplatePath)) {
      copyFileSync(signatureTemplatePath, `${backupDir}/signature-template.html`);
      console.log("✓ Email signature template backed up");
    } else {
      console.log("⚠ Email signature template not found, skipping");
    }
    
    if (existsSync(signatureLogoPath)) {
      copyFileSync(signatureLogoPath, `${backupDir}/rs-logo.jpg`);
      console.log("✓ Email signature logo backed up");
    } else {
      console.log("⚠ Email signature logo not found, skipping");
    }
    
    // Create zip file
    const zipFilePath = `${backupDir}.zip`;
    console.log(`\nCreating zip archive: ${zipFilePath}`);
    
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(zipFilePath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        console.log(`✓ Zip archive created: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
        resolve();
      });
      archive.on('error', (err) => reject(err));
      
      archive.pipe(output);
      archive.directory(backupDir, false);
      archive.finalize();
    });
    
    // Upload to Google Drive
    console.log("\nUploading backup to Google Drive...");
    const driveStorage = new GoogleDriveStorageService();
    const zipBuffer = readFileSync(zipFilePath);
    const uploadResult = await driveStorage.uploadBackup(`backup_${timestamp}.zip`, zipBuffer);
    
    console.log(`✓ Backup uploaded to Google Drive: ${uploadResult.fileName}`);
    console.log(`  File ID: ${uploadResult.fileId}`);
    
    // Clean up local files
    console.log("\nCleaning up local files...");
    rmSync(backupDir, { recursive: true, force: true });
    rmSync(zipFilePath, { force: true });
    console.log("✓ Local files cleaned up");

    console.log("\n✓ All database tables backed up successfully!");
    console.log(`\nBackup name: backup_${timestamp}`);
    console.log(`Total records: ${totalRecords}`);
    console.log(`Location: Google Drive -> RS Freight Manager/Backups/`);

    process.exit(0);
  } catch (error) {
    console.error("Error backing up databases:", error);
    process.exit(1);
  }
}

// Convert camelCase to snake_case for database column names
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function generateInsertSQL(tableName: string, data: any[]): string {
  if (data.length === 0) {
    return `-- No data to backup for ${tableName}\n`;
  }

  const columns = Object.keys(data[0]);
  let sql = `-- Backup for ${tableName}\n`;
  sql += `-- ${data.length} records\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n\n`;

  // Define column types for proper array/jsonb handling
  // IMPORTANT: Keys must be camelCase to match Drizzle property names
  const columnTypes: Record<string, Record<string, string>> = {
    job_file_groups: {
      documents: 'jsonb',
      rsInvoices: 'jsonb'
    },
    import_customers: {
      contactName: 'text[]',
      email: 'text[]',
      accountsEmail: 'text[]',
      agentContactName: 'text[]',
      agentEmail: 'text[]',
      agentAccountsEmail: 'text[]'
    },
    export_customers: {
      contactName: 'text[]',
      email: 'text[]',
      accountsEmail: 'text[]',
      agentContactName: 'text[]',
      agentEmail: 'text[]',
      agentAccountsEmail: 'text[]'
    },
    export_receivers: {
      contactName: 'text[]'
    },
    hauliers: {
      contacts: 'jsonb',
      importEmail: 'text[]',
      exportEmail: 'text[]',
      releasesEmail: 'text[]',
      accountingEmail: 'text[]',
      agentImportEmail: 'text[]',
      agentExportEmail: 'text[]',
      agentReleasesEmail: 'text[]',
      agentAccountingEmail: 'text[]'
    },
    shipping_lines: {
      contactName: 'text[]'
    },
    clearance_agents: {
      contactName: 'text[]'
    },
    messages: {
      attachments: 'jsonb'
    },
    import_shipments: {
      proofOfDelivery: 'jsonb',
      expensesToChargeOut: 'jsonb',
      additionalExpensesIn: 'jsonb',
      attachments: 'jsonb'
    },
    export_shipments: {
      proofOfDelivery: 'jsonb',
      expensesToChargeOut: 'jsonb',
      additionalExpensesIn: 'jsonb',
      attachments: 'jsonb',
      transportDocuments: 'jsonb',
      clearanceDocuments: 'jsonb'
    },
    custom_clearances: {
      transportDocuments: 'jsonb',
      clearanceDocuments: 'jsonb'
    },
    invoices: {
      lineItems: 'jsonb'
    }
  };

  for (const row of data) {
    const values = columns.map(col => {
      const value = row[col];
      // Use camelCase column name for lookup, then convert to snake_case for SQL
      const colType = columnTypes[tableName]?.[col];
      
      if (value === null || value === undefined) {
        return "NULL";
      }
      
      if (typeof value === "string") {
        // Escape backslashes first, then other special characters
        const escaped = value
          .replace(/\\/g, '\\\\')     // Escape backslashes
          .replace(/\n/g, '\\n')      // Escape newlines
          .replace(/\r/g, '\\r')      // Escape carriage returns
          .replace(/\t/g, '\\t')      // Escape tabs
          .replace(/'/g, "''");       // Escape single quotes (PostgreSQL standard)
        return `E'${escaped}'`;       // Use E'' for escape string syntax
      }
      
      if (typeof value === "boolean") {
        return value ? "TRUE" : "FALSE";
      }
      
      if (Array.isArray(value)) {
        // Check if this is a jsonb column containing an array
        if (colType === 'jsonb') {
          const jsonStr = JSON.stringify(value).replace(/'/g, "''");
          return `'${jsonStr}'::jsonb`;
        }
        
        // It's a PostgreSQL array column (text[], etc.)
        if (value.length === 0) {
          // Empty array - need type cast
          return `ARRAY[]::${colType || 'text[]'}`;
        }
        
        const arrayValues = value.map(v => {
          if (typeof v === "string") {
            // Escape single quotes and special characters for PostgreSQL array strings
            const escaped = v
              .replace(/\\/g, '\\\\')
              .replace(/'/g, "''");
            return `'${escaped}'`;
          }
          return String(v);
        }).join(",");
        return `ARRAY[${arrayValues}]`;
      }
      
      if (typeof value === "object") {
        return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
      }
      
      return String(value);
    });

    sql += `INSERT INTO ${tableName} (${columns.map(c => `"${toSnakeCase(c)}"`).join(", ")}) VALUES (${values.join(", ")});\n`;
  }

  sql += "\n";
  return sql;
}

backupContactDatabases();
