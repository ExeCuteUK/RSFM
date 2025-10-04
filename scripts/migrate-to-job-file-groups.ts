import { db } from "../server/db";
import { importShipments, exportShipments, customClearances, jobFileGroups } from "@shared/schema";
import { eq } from "drizzle-orm";

async function migrateToJobFileGroups() {
  console.log("Starting migration to job_file_groups...");

  try {
    // Get all import shipments with attachments
    const imports = await db.select().from(importShipments);
    console.log(`Found ${imports.length} import shipments`);

    // Get all custom clearances with documents
    const clearances = await db.select().from(customClearances);
    console.log(`Found ${clearances.length} custom clearances`);

    // Get all export shipments
    const exports = await db.select().from(exportShipments);
    console.log(`Found ${exports.length} export shipments`);

    const migrated: Set<number> = new Set();

    // Process import shipments
    for (const importShip of imports) {
      if (migrated.has(importShip.jobRef)) {
        console.log(`JobRef ${importShip.jobRef} already migrated, skipping...`);
        continue;
      }

      const attachments = importShip.attachments || [];
      
      if (attachments.length > 0) {
        // Check if job file group already exists
        const existing = await db.select().from(jobFileGroups).where(eq(jobFileGroups.jobRef, importShip.jobRef));
        
        if (existing.length > 0) {
          console.log(`Job file group for jobRef ${importShip.jobRef} already exists, updating...`);
          await db.update(jobFileGroups)
            .set({
              documents: attachments,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(jobFileGroups.jobRef, importShip.jobRef));
        } else {
          console.log(`Creating job file group for import jobRef ${importShip.jobRef} with ${attachments.length} documents`);
          await db.insert(jobFileGroups).values({
            jobRef: importShip.jobRef,
            documents: attachments,
            rsInvoices: [],
          });
        }
        
        migrated.add(importShip.jobRef);
      }
    }

    // Process export shipments
    for (const exportShip of exports) {
      if (migrated.has(exportShip.jobRef)) {
        console.log(`JobRef ${exportShip.jobRef} already migrated, skipping...`);
        continue;
      }

      const attachments = exportShip.attachments || [];
      
      if (attachments.length > 0) {
        // Check if job file group already exists
        const existing = await db.select().from(jobFileGroups).where(eq(jobFileGroups.jobRef, exportShip.jobRef));
        
        if (existing.length > 0) {
          console.log(`Job file group for jobRef ${exportShip.jobRef} already exists, updating...`);
          await db.update(jobFileGroups)
            .set({
              documents: attachments,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(jobFileGroups.jobRef, exportShip.jobRef));
        } else {
          console.log(`Creating job file group for export jobRef ${exportShip.jobRef} with ${attachments.length} documents`);
          await db.insert(jobFileGroups).values({
            jobRef: exportShip.jobRef,
            documents: attachments,
            rsInvoices: [],
          });
        }
        
        migrated.add(exportShip.jobRef);
      }
    }

    // Process custom clearances
    for (const clearance of clearances) {
      if (migrated.has(clearance.jobRef)) {
        console.log(`JobRef ${clearance.jobRef} already migrated, checking for additional docs...`);
        
        const transportDocs = clearance.transportDocuments || [];
        const clearanceDocs = clearance.clearanceDocuments || [];
        const allDocs = [...transportDocs, ...clearanceDocs];
        
        if (allDocs.length > 0) {
          const existing = await db.select().from(jobFileGroups).where(eq(jobFileGroups.jobRef, clearance.jobRef));
          
          if (existing.length > 0) {
            const currentDocs = existing[0].documents || [];
            const mergedDocs = [...new Set([...currentDocs, ...allDocs])]; // Remove duplicates
            
            console.log(`Merging ${allDocs.length} custom clearance docs with existing ${currentDocs.length} docs for jobRef ${clearance.jobRef}`);
            await db.update(jobFileGroups)
              .set({
                documents: mergedDocs,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(jobFileGroups.jobRef, clearance.jobRef));
          }
        }
      } else {
        const transportDocs = clearance.transportDocuments || [];
        const clearanceDocs = clearance.clearanceDocuments || [];
        const allDocs = [...transportDocs, ...clearanceDocs];
        
        if (allDocs.length > 0) {
          console.log(`Creating job file group for clearance jobRef ${clearance.jobRef} with ${allDocs.length} documents`);
          await db.insert(jobFileGroups).values({
            jobRef: clearance.jobRef,
            documents: allDocs,
            rsInvoices: [],
          });
          
          migrated.add(clearance.jobRef);
        }
      }
    }

    console.log(`\nMigration complete! Migrated ${migrated.size} job references.`);
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

migrateToJobFileGroups()
  .then(() => {
    console.log("Migration script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });
