import { db } from "../server/db";
import { importCustomers, exportCustomers, exportReceivers } from "../shared/schema";
import { readFileSync } from "fs";
import { join } from "path";

async function importContacts() {
  const filePath = join(process.cwd(), "attached_assets", "imports_1759499032593.txt");
  const fileContent = readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n").filter(line => line.trim());

  console.log(`Processing ${lines.length} contacts...`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fields = line.split("##!");

    // Parse fields
    const companyName = fields[0]?.trim() || "";
    const contactNameRaw = fields[1]?.trim() || "";
    const vatNumber = fields[2]?.trim() || null;
    const telephone = fields[3]?.trim() || null;
    const fax = fields[4]?.trim() || null; // Removed from system
    const emailRaw = fields[5]?.trim() || "";
    const addressLine1 = fields[6]?.trim() || "";
    const addressLine2 = fields[7]?.trim() || "";
    const addressLine3 = fields[8]?.trim() || "";
    const addressLine4 = fields[9]?.trim() || "";
    const addressLine5 = fields[10]?.trim() || "";
    const addressLine6 = fields[11]?.trim() || "";
    const addressLine7 = fields[12]?.trim() || "";
    const addressLine8 = fields[13]?.trim() || "";
    const addressLine9 = fields[14]?.trim() || "";
    const addressLine10 = fields[15]?.trim() || "";
    const addressLine11 = fields[16]?.trim() || "";
    const addressLine12 = fields[17]?.trim() || "";
    const addressLine13 = fields[18]?.trim() || "";
    const addressLine14 = fields[19]?.trim() || "";
    const addressLine15 = fields[20]?.trim() || "";
    const addressLine16 = fields[21]?.trim() || "";
    const addressLine17 = fields[22]?.trim() || "";
    const rsProcessFlag = fields[23]?.trim() || "0";
    const customerDefermentFlag = fields[24]?.trim() || "0";
    const pvaFlag = fields[25]?.trim() || "0";
    const anotherFlag = fields[26]?.trim() || "0";
    const agentInDover = fields[27]?.trim() || null;
    const clearanceAgentDetails = fields[28]?.trim() || null;
    const defaultDeliveryAddress = fields[29]?.trim() || null;
    const defaultSuppliersName = fields[30]?.trim() || null;
    const accountsEmail = fields[31]?.trim() || null;
    const bookingInDetails = fields[32]?.trim() || null;

    if (!companyName) {
      console.log(`Skipping line ${i + 1}: No company name`);
      continue;
    }

    // Process contact names (split by /)
    const contactNames = contactNameRaw
      ? contactNameRaw.split("/").map(n => n.trim()).filter(n => n)
      : [];

    // Process emails (split by comma)
    const emails = emailRaw
      ? emailRaw.split(",").map(e => e.trim()).filter(e => e)
      : [];

    // Process accounts email
    const accountsEmails = accountsEmail
      ? accountsEmail.split(",").map(e => e.trim()).filter(e => e)
      : [];

    // Build combined address from address lines
    const addressParts = [
      addressLine1, addressLine2, addressLine3, addressLine4, 
      addressLine5, addressLine6, addressLine7, addressLine8,
      addressLine9, addressLine10, addressLine11, addressLine12,
      addressLine13, addressLine14, addressLine15, addressLine16,
      addressLine17
    ].filter(part => part);
    
    const address = addressParts.length > 0 ? addressParts.join(",\n") : null;

    // Determine VAT Payment Method based on fields 24 and 25
    let vatPaymentMethod = "R.S Deferment"; // Default
    if (customerDefermentFlag === "1") {
      vatPaymentMethod = "Customer Deferment";
    } else if (pvaFlag === "1") {
      vatPaymentMethod = "Postponed VAT Accounting (PVA)";
    }

    // Determine if this is import or export based on rsProcessFlag
    const isImportCustomer = rsProcessFlag === "1";

    try {
      if (isImportCustomer) {
        // Insert as Import Customer
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
        console.log(`✓ Imported Import Customer: ${companyName}`);
      } else {
        // Insert as Export Customer
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
        console.log(`✓ Imported Export Customer: ${companyName}`);
      }

      // Also create Export Receiver entry if there's a delivery address
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
        console.log(`✓ Created Export Receiver: ${companyName}`);
      }
    } catch (error) {
      console.error(`Error importing ${companyName}:`, error);
    }
  }

  console.log("Import completed!");
}

importContacts().catch(console.error);
