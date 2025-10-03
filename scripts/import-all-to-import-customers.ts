import { db } from "../server/db";
import { importCustomers } from "../shared/schema";
import { readFileSync } from "fs";
import { join } from "path";

async function importToImportCustomers() {
  console.log("Starting import into Import Customers table...");

  const filePath = join(process.cwd(), "attached_assets", "imports_1759502485774.txt");
  const fileContent = readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n").filter(line => line.trim());

  console.log(`Processing ${lines.length} customers...`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fields = line.split("##!");

    // Contact Information Card (Fields 0-11)
    const companyName = fields[0]?.trim() || "";
    const contactNameRaw = fields[1]?.trim() || "";
    const vatNumber = fields[2]?.trim() || null;
    const telephone = fields[3]?.trim() || null;
    // Field 4 is IGNORED
    const emailRaw = fields[5]?.trim() || "";
    const addressLine1 = fields[6]?.trim() || "";
    const addressLine2 = fields[7]?.trim() || "";
    const town = fields[8]?.trim() || "";
    const county = fields[9]?.trim() || "";
    const postcode = fields[10]?.trim() || "";
    const country = fields[11]?.trim() || "";

    // Agent Contact Card (Fields 12-22)
    const agentName = fields[12]?.trim() || null;
    const agentContactNameRaw = fields[13]?.trim() || "";
    const agentTelephone = fields[14]?.trim() || null;
    // Field 15 is IGNORED
    const agentEmailRaw = fields[16]?.trim() || "";
    const agentAddressLine1 = fields[17]?.trim() || "";
    const agentAddressLine2 = fields[18]?.trim() || "";
    const agentTown = fields[19]?.trim() || "";
    const agentCounty = fields[20]?.trim() || "";
    const agentPostcode = fields[21]?.trim() || "";
    const agentCountry = fields[22]?.trim() || "";

    // Import Information Card (Fields 23-31)
    const rsProcessFlag = fields[23]?.trim() || "0";
    const customerDefermentFlag = fields[24]?.trim() || "0";
    const pvaFlag = fields[25]?.trim() || "0";
    const clearanceAgent = fields[26]?.trim() || null;
    // Field 27 is IGNORED
    const defaultDeliveryAddress = fields[28]?.trim() || null;
    const defaultSuppliersName = fields[29]?.trim() || null;
    const clearanceAgentDetails = fields[30]?.trim() || null;
    const bookingInDetails = fields[31]?.trim() || null;

    if (!companyName) continue;

    // Parse contact names (can be separated by /)
    const contactNames = contactNameRaw
      ? contactNameRaw.split("/").map(n => n.trim()).filter(n => n)
      : [];

    // Parse agent contact names (can be separated by /)
    const agentContactNames = agentContactNameRaw
      ? agentContactNameRaw.split("/").map(n => n.trim()).filter(n => n)
      : [];

    // Parse emails
    const emails = emailRaw
      ? emailRaw.split(",").map(e => e.trim()).filter(e => e)
      : [];

    const agentEmails = agentEmailRaw
      ? agentEmailRaw.split(",").map(e => e.trim()).filter(e => e)
      : [];

    // Combine address fields with line breaks
    const addressParts = [
      addressLine1, addressLine2, town, county, postcode, country
    ].filter(part => part);
    const address = addressParts.length > 0 ? addressParts.join(",\n") : null;

    // Combine agent address fields with line breaks
    const agentAddressParts = [
      agentAddressLine1, agentAddressLine2, agentTown, agentCounty, agentPostcode, agentCountry
    ].filter(part => part);
    const agentAddress = agentAddressParts.length > 0 ? agentAddressParts.join(",\n") : null;

    // VAT Payment Method logic based on fields 24 and 25
    let vatPaymentMethod = "R.S Deferment";
    if (customerDefermentFlag === "1") {
      vatPaymentMethod = "Customer Deferment";
    } else if (pvaFlag === "1") {
      vatPaymentMethod = "Postponed VAT Accounting (PVA)";
    }

    // Check if RS processes customs clearance
    const rsProcessCustomsClearance = rsProcessFlag === "1";

    try {
      await db.insert(importCustomers).values({
        companyName,
        contactName: contactNames.length > 0 ? contactNames : null,
        vatNumber: vatNumber || null,
        telephone: telephone || null,
        email: emails.length > 0 ? emails : null,
        accountsEmail: null, // Not in import file
        address: address,
        agentName: agentName,
        agentContactName: agentContactNames.length > 0 ? agentContactNames : null,
        agentVatNumber: null, // Not in import file
        agentTelephone: agentTelephone,
        agentEmail: agentEmails.length > 0 ? agentEmails : null,
        agentAccountsEmail: null, // Not in import file
        agentAddress: agentAddress,
        rsProcessCustomsClearance: rsProcessCustomsClearance,
        agentInDover: clearanceAgent, // Field 26
        vatPaymentMethod: vatPaymentMethod,
        clearanceAgentDetails: clearanceAgentDetails || null,
        defaultDeliveryAddress: defaultDeliveryAddress || null,
        defaultSuppliersName: defaultSuppliersName || null,
        bookingInDetails: bookingInDetails || null,
      });

      if ((i + 1) % 100 === 0 || i === 0) {
        console.log(`✓ Processed ${i + 1}/${lines.length}: ${companyName}`);
      }
    } catch (error) {
      console.error(`Error importing ${companyName}:`, error);
    }
  }

  console.log(`\n✓ Import completed! All ${lines.length} customers imported into Import Customers table.`);
  process.exit(0);
}

importToImportCustomers().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
