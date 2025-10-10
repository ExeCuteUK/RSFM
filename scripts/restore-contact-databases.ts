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

    // Column name mapping for schema changes (camelCase -> snake_case)
    const columnMapping: Record<string, Record<string, string>> = {
      export_receivers: {
        companyName: 'company_name',
        createdBy: 'created_by'
      },
      import_customers: {
        companyName: 'company_name',
        contactName: 'contact_name',
        contactPosition: 'contact_position',
        accountsEmail: 'accounts_email',
        agentName: 'agent_name',
        agentContactName: 'agent_contact_name',
        agentContactPosition: 'agent_contact_position',
        agentEmail: 'agent_email',
        agentTelephone: 'agent_telephone',
        vatPaymentMethod: 'vat_payment_method',
        defermentDetails: 'deferment_details',
        defermentNumber: 'deferment_number',
        defermentApprovalNumber: 'deferment_approval_number',
        createdBy: 'created_by'
      },
      export_customers: {
        companyName: 'company_name',
        contactName: 'contact_name',
        contactPosition: 'contact_position',
        accountsEmail: 'accounts_email',
        createdBy: 'created_by'
      }
    };

    // Restore each table
    console.log("\nRestoring data...");
    for (const table of tables) {
      try {
        const sqlContent = readFileSync(table.file, "utf-8");
        
        // Filter out comments and empty lines
        const filteredContent = sqlContent
          .split("\n")
          .filter(line => line.trim() && !line.trim().startsWith("--"))
          .join("\n");
        
        // Smart split by semicolons, ignoring semicolons inside string literals
        // Handles SQL-standard escaped quotes ('') and backslash escapes
        let statements: string[] = [];
        let currentStmt = '';
        let inString = false;
        
        for (let i = 0; i < filteredContent.length; i++) {
          const char = filteredContent[i];
          const nextChar = i + 1 < filteredContent.length ? filteredContent[i + 1] : null;
          
          // Handle single quotes (string delimiters and SQL escaping)
          if (char === "'") {
            currentStmt += char;
            
            if (inString) {
              // Check if it's an escaped quote ('') or end of string
              if (nextChar === "'") {
                // It's an escaped quote, add both and skip next
                currentStmt += nextChar;
                i++;
              } else {
                // It's the end of the string
                inString = false;
              }
            } else {
              // Start of a string
              inString = true;
            }
            continue;
          }
          
          // Split on semicolons only when outside strings
          if (char === ';' && !inString) {
            if (currentStmt.trim()) {
              statements.push(currentStmt.trim());
            }
            currentStmt = '';
            continue;
          }
          
          currentStmt += char;
        }
        
        // Add the last statement if exists
        if (currentStmt.trim()) {
          statements.push(currentStmt.trim());
        }

        // Apply column name mapping if needed
        if (columnMapping[table.name]) {
          statements = statements.map(stmt => {
            let mappedStmt = stmt;
            Object.entries(columnMapping[table.name]).forEach(([oldName, newName]) => {
              // Replace column names in INSERT statements
              const regex = new RegExp(`"${oldName}"`, 'g');
              mappedStmt = mappedStmt.replace(regex, `"${newName}"`);
            });
            return mappedStmt;
          });
        }

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
