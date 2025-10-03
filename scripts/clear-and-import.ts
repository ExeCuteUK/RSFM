import { db } from "../server/db";
import { importCustomers, exportCustomers, exportReceivers } from "../shared/schema";
import { readFileSync } from "fs";
import { join } from "path";
import { sql } from "drizzle-orm";

async function clearAndImport() {
  console.log("Clearing existing data...");
  
  // Clear all tables
  await db.delete(importCustomers);
  await db.delete(exportCustomers);
  await db.delete(exportReceivers);
  
  console.log("✓ Database cleared");
  console.log("\nStarting import...");

  const filePath = join(process.cwd(), "attached_assets", "imports_1759499032593.txt");
  const fileContent = readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n").filter(line => line.trim());

  console.log(`Processing ${lines.length} contacts...`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fields = line.split("##!");

    const companyName = fields[0]?.trim() || "";
    const contactNameRaw = fields[1]?.trim() || "";
    const vatNumber = fields[2]?.trim() || null;
    const telephone = fields[3]?.trim() || null;
    const emailRaw = fields[5]?.trim() || "";
    const addressLine1 = fields[6]?.trim() || "";
    const addressLine2 = fields[7]?.trim() || "";
    const addressLine3 = fields[8]?.trim() || "";
    const rsProcessFlag = fields[23]?.trim() || "0";
    const customerDefermentFlag = fields[24]?.trim() || "0";
    const pvaFlag = fields[25]?.trim() || "0";
    const agentInDover = fields[27]?.trim() || null;
    const clearanceAgentDetails = fields[28]?.trim() || null;
    const defaultDeliveryAddress = fields[29]?.trim() || null;
    const defaultSuppliersName = fields[30]?.trim() || null;
    const accountsEmail = fields[31]?.trim() || null;
    const bookingInDetails = fields[32]?.trim() || null;

    if (!companyName) continue;

    const contactNames = contactNameRaw
      ? contactNameRaw.split("/").map(n => n.trim()).filter(n => n)
      : [];

    const emails = emailRaw
      ? emailRaw.split(",").map(e => e.trim()).filter(e => e)
      : [];

    const accountsEmails = accountsEmail
      ? accountsEmail.split(",").map(e => e.trim()).filter(e => e)
      : [];

    const addressParts = [
      addressLine1, addressLine2, addressLine3
    ].filter(part => part);
    
    const address = addressParts.length > 0 ? addressParts.join(",\n") : null;

    // VAT Payment Method logic based on fields 24 and 25
    let vatPaymentMethod = "R.S Deferment";
    if (customerDefermentFlag === "1") {
      vatPaymentMethod = "Customer Deferment";
    } else if (pvaFlag === "1") {
      vatPaymentMethod = "Postponed VAT Accounting (PVA)";
    }

    const isImportCustomer = rsProcessFlag === "1";

    try {
      if (isImportCustomer) {
        await db.insert(importCustomers).values({
          companyName,
          contactName: contactNames.length > 0 ? contactNames : null,
          vatNumber: vatNumber || null,
          telephone: telephone || null,
          email: emails.length > 0 ? emails : null,
          accountsEmail: accountsEmails.length > 0 ? accountsEmails : null,
          address: address,
          agentName: null,
          agentContactName: null,
          agentVatNumber: null,
          agentTelephone: null,
          agentEmail: null,
          agentAccountsEmail: null,
          agentAddress: null,
          rsProcessCustomsClearance: true,
          agentInDover: agentInDover || null,
          vatPaymentMethod: vatPaymentMethod,
          clearanceAgentDetails: clearanceAgentDetails || null,
          defaultDeliveryAddress: defaultDeliveryAddress || null,
          defaultSuppliersName: defaultSuppliersName || null,
          bookingInDetails: bookingInDetails || null,
        });
        console.log(`✓ Import Customer: ${companyName} (VAT: ${vatPaymentMethod})`);
      } else {
        await db.insert(exportCustomers).values({
          companyName,
          contactName: contactNames.length > 0 ? contactNames : null,
          vatNumber: vatNumber || null,
          telephone: telephone || null,
          email: emails.length > 0 ? emails : null,
          accountsEmail: accountsEmails.length > 0 ? accountsEmails : null,
          address: address,
          agentName: null,
          agentContactName: null,
          agentVatNumber: null,
          agentTelephone: null,
          agentEmail: null,
          agentAccountsEmail: null,
          agentAddress: null,
        });
        console.log(`✓ Export Customer: ${companyName}`);
      }

      if (defaultDeliveryAddress) {
        const deliveryParts = defaultDeliveryAddress.split(",").map(p => p.trim()).filter(p => p);
        
        await db.insert(exportReceivers).values({
          companyName: companyName,
          email: emails.length > 0 ? emails : null,
          addressLine1: deliveryParts[0] || null,
          addressLine2: deliveryParts[1] || null,
          town: deliveryParts[2] || null,
          county: deliveryParts[3] || null,
          postcode: deliveryParts[4] || null,
          country: deliveryParts[5] || null,
        });
      }
    } catch (error) {
      console.error(`Error: ${companyName}:`, error);
    }
  }

  console.log("\n✓ Import completed successfully!");
  process.exit(0);
}

clearAndImport().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
