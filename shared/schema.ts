import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer } from "drizzle-orm/pg-core";
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

// Export Receivers Database
export const exportReceivers = pgTable("export_receivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Contact Information
  companyName: text("company_name").notNull(),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  town: text("town"),
  county: text("county"),
  postcode: text("postcode"),
  country: text("country"),
});

export const insertExportReceiverSchema = createInsertSchema(exportReceivers).omit({
  id: true,
});

export type InsertExportReceiver = z.infer<typeof insertExportReceiverSchema>;
export type ExportReceiver = typeof exportReceivers.$inferSelect;

// Import Shipments Database
export const importShipments = pgTable("import_shipments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobRef: integer("job_ref").notNull(),
  jobType: text("job_type").notNull().default("import"),
  
  // Status
  status: text("status").notNull().default("Pending"),
  
  // Customer Reference
  importCustomerId: varchar("import_customer_id"),
  
  // Shipment Details
  importDateEtaPort: text("import_date_eta_port"),
  portOfArrival: text("port_of_arrival"),
  trailerOrContainerNumber: text("trailer_or_container_number"),
  departureCountry: text("departure_country"),
  containerShipment: boolean("container_shipment").default(false),
  vesselName: text("vessel_name"),
  
  // Cargo Details
  numberOfPieces: text("number_of_pieces"),
  packaging: text("packaging"),
  weight: text("weight"),
  cube: text("cube"),
  goodsDescription: text("goods_description"),
  
  // Financial Details
  invoiceValue: text("invoice_value"),
  freightCharge: text("freight_charge"),
  clearanceCharge: text("clearance_charge"),
  currency: text("currency"),
  additionalCommodityCodes: integer("additional_commodity_codes"),
  
  // Customs Details
  vatZeroRated: boolean("vat_zero_rated").default(false),
  clearanceType: text("clearance_type"),
  deliveryOrder: text("delivery_order"),
  customsClearanceAgent: text("customs_clearance_agent"),
  rsToClear: boolean("rs_to_clear").default(false),
  
  // Additional Details
  customerReferenceNumber: text("customer_reference_number"),
  deliveryAddress: text("delivery_address"),
  supplierName: text("supplier_name"),
  
  // File Attachments (stored as JSON array of {name, url, uploadedAt})
  attachments: text("attachments"),
  
  // Link to auto-created customs clearance
  linkedClearanceId: varchar("linked_clearance_id"),
});

export const insertImportShipmentSchema = createInsertSchema(importShipments).omit({
  id: true,
  jobRef: true,
});

export type InsertImportShipment = z.infer<typeof insertImportShipmentSchema>;
export type ImportShipment = typeof importShipments.$inferSelect;

// Export Shipments Database
export const exportShipments = pgTable("export_shipments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobRef: integer("job_ref").notNull(),
  jobType: text("job_type").notNull().default("export"),
  
  // Status
  status: text("status").notNull().default("Pending"),
  
  // Customer References
  receiverId: varchar("receiver_id"),
  destinationCustomerId: varchar("destination_customer_id"),
  
  // Shipment Details
  loadDate: text("load_date"),
  trailerNo: text("trailer_no"),
  jobReference: text("job_reference"),
  destination: text("destination"),
  incoterms: text("incoterms"),
  
  // Clearance Agents
  exportClearanceAgent: text("export_clearance_agent"),
  arrivalClearanceAgent: text("arrival_clearance_agent"),
  
  // Cargo Details
  supplier: text("supplier"),
  consignee: text("consignee"),
  value: text("value"),
  numPackages: text("num_packages"),
  packing: text("packing"),
  description: text("description"),
  grossWeightKg: text("gross_weight_kg"),
  cbm: text("cbm"),
  cargoWeight: text("cargo_weight"),
  
  // Rate Fields
  freightRateOut: text("freight_rate_out"),
  exportClearanceCost: text("export_clearance_cost"),
  arrivalClearanceCost: text("arrival_clearance_cost"),
  currency: text("currency"),
  additionalCommodityCodes: integer("additional_commodity_codes"),
  
  // Haulier Information
  haulierName: text("haulier_name"),
  haulierContactName: text("haulier_contact_name"),
  
  // File Attachments (stored as JSON array of {name, url, uploadedAt})
  attachments: text("attachments"),
});

export const insertExportShipmentSchema = createInsertSchema(exportShipments).omit({
  id: true,
  jobRef: true,
});

export type InsertExportShipment = z.infer<typeof insertExportShipmentSchema>;
export type ExportShipment = typeof exportShipments.$inferSelect;

// Custom Clearances Database
export const customClearances = pgTable("custom_clearances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobRef: integer("job_ref").notNull(),
  jobType: text("job_type").notNull(),
  
  // Status (Customs-specific)
  status: text("status").notNull().default("Waiting Entry"),
  
  // Customer References
  importCustomerId: varchar("import_customer_id"),
  exportCustomerId: varchar("export_customer_id"),
  receiverId: varchar("receiver_id"),
  
  // Shipment Details
  etaPort: text("eta_port"),
  portOfArrival: text("port_of_arrival"),
  trailerOrContainerNumber: text("trailer_or_container_number"),
  departureFrom: text("departure_from"),
  containerShipment: boolean("container_shipment").default(false),
  vesselName: text("vessel_name"),
  
  // Cargo Details
  numberOfPieces: text("number_of_pieces"),
  packaging: text("packaging"),
  weight: text("weight"),
  cube: text("cube"),
  goodsDescription: text("goods_description"),
  
  // Financial Details
  invoiceValue: text("invoice_value"),
  transportCosts: text("transport_costs"),
  clearanceCharge: text("clearance_charge"),
  currency: text("currency"),
  additionalCommodityCodes: integer("additional_commodity_codes"),
  
  // Additional Details (renamed from Customs Details)
  vatZeroRated: boolean("vat_zero_rated").default(false),
  clearanceType: text("clearance_type"),
  customerReferenceNumber: text("customer_reference_number"),
  supplierName: text("supplier_name"),
  
  // File Attachments (stored as JSON array of {name, url, uploadedAt})
  attachments: text("attachments"),
  
  // Link to source shipment
  createdFromType: text("created_from_type"),
  createdFromId: varchar("created_from_id"),
});

export const insertCustomClearanceSchema = createInsertSchema(customClearances).omit({
  id: true,
  jobRef: true,
});

export type InsertCustomClearance = z.infer<typeof insertCustomClearanceSchema>;
export type CustomClearance = typeof customClearances.$inferSelect;