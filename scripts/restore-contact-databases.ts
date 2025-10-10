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

    // Use the backupName as-is (it might already include the full path)
    const backupDir = backupName.startsWith('backups/') ? backupName : `backups/${backupName}`;
    
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
        vatNumber: 'vat_number',
        accountsEmail: 'accounts_email',
        agentName: 'agent_name',
        agentContactName: 'agent_contact_name',
        agentVatNumber: 'agent_vat_number',
        agentTelephone: 'agent_telephone',
        agentEmail: 'agent_email',
        agentAccountsEmail: 'agent_accounts_email',
        agentAddress: 'agent_address',
        createdBy: 'created_by'
      }
    };

    // Restore each table
    console.log("\nRestoring data...");
    for (const table of tables) {
      try {
        const sqlContent = readFileSync(table.file, "utf-8");
        
        // Fix legacy ARRAY[] syntax from old backups
        const fixLegacyArraySyntax = (content: string, tableName: string): string => {
          let fixedContent = content;
          
          // Fix broken object serialization: ARRAY[...object Object...] -> '[]'::jsonb
          // Match ARRAY[...] containing "[object Object]" (greedy match to closing bracket)
          fixedContent = fixedContent.replace(/ARRAY\[.*?\[object Object\].*\]/g, "'[]'::jsonb");
          
          // Define column types for each table
          const columnTypes: Record<string, { jsonb?: string[], textArray?: string[] }> = {
            job_file_groups: { jsonb: ['documents', 'rs_invoices'] },
            hauliers: { 
              jsonb: ['contacts'],
              textArray: ['import_email', 'export_email', 'releases_email', 'accounting_email', 
                         'agent_import_email', 'agent_export_email', 'agent_releases_email', 'agent_accounting_email']
            },
            messages: { jsonb: ['attachments'] },
            import_shipments: { jsonb: ['proof_of_delivery', 'expenses_to_charge_out', 'additional_expenses_in', 'attachments'] },
            export_shipments: { jsonb: ['proof_of_delivery', 'expenses_to_charge_out', 'additional_expenses_in', 'attachments', 'transport_documents', 'clearance_documents'] },
            custom_clearances: { jsonb: ['transport_documents', 'clearance_documents'] },
            invoices: { jsonb: ['line_items'] },
            import_customers: { textArray: ['contact_name', 'email', 'accounts_email', 'agent_contact_name', 'agent_email', 'agent_accounts_email'] },
            export_customers: { textArray: ['contact_name', 'email', 'accounts_email', 'agent_contact_name', 'agent_email', 'agent_accounts_email'] },
            export_receivers: { textArray: ['contact_name'] },
            shipping_lines: { textArray: ['contact_name'] },
            clearance_agents: { textArray: ['contact_name'] }
          };
          
          const tableTypes = columnTypes[tableName];
          if (!tableTypes) return fixedContent;
          
          // If table has only jsonb arrays, replace all ARRAY[] with jsonb
          if (tableTypes.jsonb && !tableTypes.textArray) {
            fixedContent = fixedContent.replace(/ARRAY\[\]/g, "'[]'::jsonb");
          }
          // If table has only text arrays, replace all ARRAY[] with text[]
          else if (tableTypes.textArray && !tableTypes.jsonb) {
            fixedContent = fixedContent.replace(/ARRAY\[\]/g, "ARRAY[]::text[]");
          }
          // If table has both types (like hauliers), DO NOT do global replacement
          // Only [object Object] arrays have been fixed above (always jsonb)
          // Any remaining bare ARRAY[] will cause error - better to fail than corrupt data
          // Manual inspection/fix required for such edge cases
          
          return fixedContent;
        };
        
        // Fix the SQL content and execute it
        const fixedContent = fixLegacyArraySyntax(sqlContent, table.name);
        await db.execute(sql.raw(fixedContent));
        
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
