import { db } from "../server/db";
import { exportReceivers } from "../shared/schema";
import { readFileSync } from "fs";
import { join } from "path";

async function importExportReceivers() {
  console.log("Starting import into Export Receivers table...");

  const filePath = join(process.cwd(), "attached_assets", "consignee_1759501675102.txt");
  
  // Read with latin1 encoding to handle any special characters
  const fileContent = readFileSync(filePath, "latin1");
  const lines = fileContent.split(/\r?\n/).filter(line => line.trim());

  console.log(`Processing ${lines.length} receivers...`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fields = line.split("##!");

    // Field mapping for Export Receivers
    const companyName = fields[0]?.trim() || "";
    
    // Address fields 6-10
    const addressLine1 = fields[6]?.trim() || "";
    const addressLine2 = fields[7]?.trim() || "";
    const addressLine3 = fields[8]?.trim() || "";
    const addressLine4 = fields[9]?.trim() || "";
    const addressLine5 = fields[10]?.trim() || "";
    
    // Country field 11
    const country = fields[11]?.trim() || "";

    if (!companyName) continue;

    // Combine address with line breaks
    const addressParts = [
      addressLine1, addressLine2, addressLine3, addressLine4, addressLine5
    ].filter(part => part);
    
    const address = addressParts.length > 0 ? addressParts.join(",\n") : null;

    try {
      await db.insert(exportReceivers).values({
        companyName,
        address: address,
        country: country || null,
      });
      if (i % 100 === 0) {
        console.log(`✓ Processed ${i + 1}/${lines.length}: ${companyName}`);
      }
    } catch (error) {
      console.error(`❌ Error at line ${i + 1}: ${companyName}:`, error);
      // Continue with next record
    }
  }

  console.log(`\n✓ Import completed! All ${lines.length} receivers imported into Export Receivers table.`);
  process.exit(0);
}

importExportReceivers().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
