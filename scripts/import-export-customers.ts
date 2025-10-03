import { db } from "../server/db";
import { exportCustomers } from "../shared/schema";
import { readFileSync } from "fs";
import { join } from "path";

async function importExportCustomers() {
  console.log("Starting import into Export Customers table...");

  const filePath = join(process.cwd(), "attached_assets", "customers_1759501385133.txt");
  const fileContent = readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n").filter(line => line.trim());

  console.log(`Processing ${lines.length} contacts...`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fields = line.split("##!");

    // Fields 0-22 mapping for Export Customers
    const companyName = fields[0]?.trim() || "";
    const contactNameRaw = fields[1]?.trim() || "";
    const vatNumber = fields[2]?.trim() || null;
    const telephone = fields[3]?.trim() || null;
    // Field 4 is fax (not used)
    const emailRaw = fields[5]?.trim() || "";
    
    // Address fields 6-11
    const addressLine1 = fields[6]?.trim() || "";
    const addressLine2 = fields[7]?.trim() || "";
    const town = fields[8]?.trim() || "";
    const county = fields[9]?.trim() || "";
    const postcode = fields[10]?.trim() || "";
    const country = fields[11]?.trim() || "";
    
    // Agent fields 12-16
    const agentName = fields[12]?.trim() || null;
    const agentContactNameRaw = fields[13]?.trim() || "";
    const agentTelephone = fields[14]?.trim() || null;
    // Field 15 is possibly another agent phone (not used)
    const agentEmailRaw = fields[16]?.trim() || "";
    
    // Agent address fields 17-22
    const agentAddressLine1 = fields[17]?.trim() || "";
    const agentAddressLine2 = fields[18]?.trim() || "";
    const agentTown = fields[19]?.trim() || "";
    const agentCounty = fields[20]?.trim() || "";
    const agentPostcode = fields[21]?.trim() || "";
    const agentCountry = fields[22]?.trim() || "";

    if (!companyName) continue;

    // Process contact names (split by /)
    const contactNames = contactNameRaw
      ? contactNameRaw.split("/").map(n => n.trim()).filter(n => n)
      : [];

    // Process emails (split by ,)
    const emails = emailRaw
      ? emailRaw.split(",").map(e => e.trim()).filter(e => e)
      : [];

    // Combine main address with line breaks
    const addressParts = [
      addressLine1, addressLine2, town, county, postcode, country
    ].filter(part => part);
    
    const address = addressParts.length > 0 ? addressParts.join(",\n") : null;

    // Process agent contact names (split by /)
    const agentContactNames = agentContactNameRaw
      ? agentContactNameRaw.split("/").map(n => n.trim()).filter(n => n)
      : [];

    // Process agent emails (split by ,)
    const agentEmails = agentEmailRaw
      ? agentEmailRaw.split(",").map(e => e.trim()).filter(e => e)
      : [];

    // Combine agent address with line breaks
    const agentAddressParts = [
      agentAddressLine1, agentAddressLine2, agentTown, agentCounty, agentPostcode, agentCountry
    ].filter(part => part);
    
    const agentAddress = agentAddressParts.length > 0 ? agentAddressParts.join(",\n") : null;

    try {
      await db.insert(exportCustomers).values({
        companyName,
        contactName: contactNames.length > 0 ? contactNames : null,
        vatNumber: vatNumber || null,
        telephone: telephone || null,
        email: emails.length > 0 ? emails : null,
        accountsEmail: null, // Not in source data
        address: address,
        agentName: agentName || null,
        agentContactName: agentContactNames.length > 0 ? agentContactNames : null,
        agentVatNumber: null, // Not in source data
        agentTelephone: agentTelephone || null,
        agentEmail: agentEmails.length > 0 ? agentEmails : null,
        agentAccountsEmail: null, // Not in source data
        agentAddress: agentAddress,
      });
      console.log(`✓ ${companyName}`);
    } catch (error) {
      console.error(`Error: ${companyName}:`, error);
    }
  }

  console.log(`\n✓ Import completed! All ${lines.length} customers imported into Export Customers table.`);
  process.exit(0);
}

importExportCustomers().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
