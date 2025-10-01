import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Import Customers Database
export const importCustomers = pgTable("import_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Contact Information
  companyName: text("company_name").notNull(),
  contactName: text("contact_name"),
  vatNumber: text("vat_number"),
  telephone: text("telephone"),
  fax: text("fax"),
  email: text("email"),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  town: text("town"),
  county: text("county"),
  postcode: text("postcode"),
  country: text("country"),
  
  // Agent Information
  agentName: text("agent_name"),
  agentContactName: text("agent_contact_name"),
  agentTelephone: text("agent_telephone"),
  agentFax: text("agent_fax"),
  agentEmail: text("agent_email"),
  agentAddressLine1: text("agent_address_line_1"),
  agentAddressLine2: text("agent_address_line_2"),
  agentTown: text("agent_town"),
  agentCounty: text("agent_county"),
  agentPostcode: text("agent_postcode"),
  agentCountry: text("agent_country"),
  
  // Import Information
  rsProcessCustomsClearance: boolean("rs_process_customs_clearance").default(false),
  agentInDover: text("agent_in_dover"),
  vatDanAuthority: boolean("vat_dan_authority").default(false),
  postponeVatPayment: boolean("postpone_vat_payment").default(false),
  clearanceAgentDetails: text("clearance_agent_details"),
  defaultDeliveryAddress: text("default_delivery_address"),
  defaultSuppliersName: text("default_suppliers_name"),
  bookingInDetails: text("booking_in_details"),
});

export const insertImportCustomerSchema = createInsertSchema(importCustomers).omit({
  id: true,
});

export type InsertImportCustomer = z.infer<typeof insertImportCustomerSchema>;
export type ImportCustomer = typeof importCustomers.$inferSelect;

// Export Customers Database
export const exportCustomers = pgTable("export_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Contact Information
  companyName: text("company_name").notNull(),
  contactName: text("contact_name"),
  vatNumber: text("vat_number"),
  telephone: text("telephone"),
  fax: text("fax"),
  email: text("email"),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  town: text("town"),
  county: text("county"),
  postcode: text("postcode"),
  country: text("country"),
  
  // Agent Information
  agentName: text("agent_name"),
  agentContactName: text("agent_contact_name"),
  agentTelephone: text("agent_telephone"),
  agentFax: text("agent_fax"),
  agentEmail: text("agent_email"),
  agentAddressLine1: text("agent_address_line_1"),
  agentAddressLine2: text("agent_address_line_2"),
  agentTown: text("agent_town"),
  agentCounty: text("agent_county"),
  agentPostcode: text("agent_postcode"),
  agentCountry: text("agent_country"),
});

export const insertExportCustomerSchema = createInsertSchema(exportCustomers).omit({
  id: true,
});

export type InsertExportCustomer = z.infer<typeof insertExportCustomerSchema>;
export type ExportCustomer = typeof exportCustomers.$inferSelect;

// Export Receivers Database (placeholder - awaiting field specifications)
export const exportReceivers = pgTable("export_receivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  telephone: text("telephone"),
  // Additional fields to be added based on user specifications
});

export const insertExportReceiverSchema = createInsertSchema(exportReceivers).omit({
  id: true,
});

export type InsertExportReceiver = z.infer<typeof insertExportReceiverSchema>;
export type ExportReceiver = typeof exportReceivers.$inferSelect;