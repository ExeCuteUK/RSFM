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
  email: text("email").array(),
  accountsEmail: text("accounts_email").array(),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  town: text("town"),
  county: text("county"),
  postcode: text("postcode"),
  country: text("country"),
  
  // Agent Information
  agentName: text("agent_name"),
  agentContactName: text("agent_contact_name"),
  agentVatNumber: text("agent_vat_number"),
  agentTelephone: text("agent_telephone"),
  agentEmail: text("agent_email").array(),
  agentAccountsEmail: text("agent_accounts_email").array(),
  agentAddressLine1: text("agent_address_line_1"),
  agentAddressLine2: text("agent_address_line_2"),
  agentTown: text("agent_town"),
  agentCounty: text("agent_county"),
  agentPostcode: text("agent_postcode"),
  agentCountry: text("agent_country"),
  
  // Import Information
  rsProcessCustomsClearance: boolean("rs_process_customs_clearance").default(false),
  agentInDover: text("agent_in_dover"),
  vatPaymentMethod: text("vat_payment_method"),
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
  email: text("email").array(),
  accountsEmail: text("accounts_email").array(),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  town: text("town"),
  county: text("county"),
  postcode: text("postcode"),
  country: text("country"),
  
  // Agent Information
  agentName: text("agent_name"),
  agentContactName: text("agent_contact_name"),
  agentVatNumber: text("agent_vat_number"),
  agentTelephone: text("agent_telephone"),
  agentEmail: text("agent_email").array(),
  agentAccountsEmail: text("agent_accounts_email").array(),
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
  email: text("email").array(),
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

// Hauliers Database
export const hauliers = pgTable("hauliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Contact Information
  haulierName: text("haulier_name").notNull(),
  homeCountry: text("home_country"),
  address: text("address"),
  telephone: text("telephone"),
  mobile: text("mobile"),
  email: text("email").array(),
  
  // Service Information
  destinationCountries: text("destination_countries").array(),
});

export const insertHaulierSchema = createInsertSchema(hauliers).omit({
  id: true,
});

export type InsertHaulier = z.infer<typeof insertHaulierSchema>;
export type Haulier = typeof hauliers.$inferSelect;

// Import Shipments Database
export const importShipments = pgTable("import_shipments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobRef: integer("job_ref").notNull(),
  jobType: text("job_type").notNull().default("import"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_DATE`),
  
  // Status
  status: text("status").notNull().default("Pending"),
  
  // Customer Reference
  importCustomerId: varchar("import_customer_id"),
  
  // Shipment Details
  bookingDate: text("booking_date"),
  approxLoadDate: text("approx_load_date"),
  dispatchDate: text("dispatch_date"),
  deliveryDate: text("delivery_date"),
  deliveryReference: text("delivery_reference"),
  deliveryTimeNotes: text("delivery_time_notes"),
  proofOfDelivery: text("proof_of_delivery").array(),
  importDateEtaPort: text("import_date_eta_port"),
  portOfArrival: text("port_of_arrival"),
  trailerOrContainerNumber: text("trailer_or_container_number"),
  departureCountry: text("departure_country"),
  containerShipment: boolean("container_shipment").default(false),
  vesselName: text("vessel_name"),
  incoterms: text("incoterms"),
  
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
  
  // Haulier Information
  haulierName: text("haulier_name"),
  haulierContactName: text("haulier_contact_name"),
  
  // Customs Details
  vatZeroRated: boolean("vat_zero_rated").default(false),
  clearanceType: text("clearance_type"),
  customsClearanceAgent: text("customs_clearance_agent"),
  rsToClear: boolean("rs_to_clear").default(false),
  
  // Additional Details
  customerReferenceNumber: text("customer_reference_number"),
  deliveryAddress: text("delivery_address"),
  supplierName: text("supplier_name"),
  
  // File Attachments (stored as array of file paths from object storage)
  attachments: text("attachments").array(),
  
  // Link to auto-created customs clearance
  linkedClearanceId: varchar("linked_clearance_id"),
});

export const insertImportShipmentSchema = createInsertSchema(importShipments).omit({
  id: true,
  jobRef: true,
}).extend({
  importCustomerId: z.string().min(1, "Import Customer is required").nullable().transform((val) => {
    if (!val || val.length === 0) {
      throw new Error("Import Customer is required");
    }
    return val;
  }),
}).superRefine((data, ctx) => {
  // Check if Import Customer is required
  if (!data.importCustomerId || data.importCustomerId.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Import Customer is required",
      path: ["importCustomerId"],
    });
  }
  
  // Check conditional requirements when R.S To Clear is enabled
  if (data.rsToClear) {
    if (!data.clearanceType || data.clearanceType.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Clearance Type is required when R.S To Clear is enabled",
        path: ["clearanceType"],
      });
    }
    if (data.additionalCommodityCodes === undefined || data.additionalCommodityCodes === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Total Commodity Codes is required when R.S To Clear is enabled",
        path: ["additionalCommodityCodes"],
      });
    }
  }
});

export type InsertImportShipment = z.infer<typeof insertImportShipmentSchema>;
export type ImportShipment = typeof importShipments.$inferSelect;

// Export Shipments Database
export const exportShipments = pgTable("export_shipments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobRef: integer("job_ref").notNull(),
  jobType: text("job_type").notNull().default("export"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_DATE`),
  
  // Status
  status: text("status").notNull().default("Pending"),
  
  // Customer References
  receiverId: varchar("receiver_id"),
  destinationCustomerId: varchar("destination_customer_id"),
  customerReferenceNumber: text("customer_reference_number"),
  
  // Shipment Details
  bookingDate: text("booking_date"),
  approxLoadDate: text("approx_load_date"),
  dispatchDate: text("dispatch_date"),
  deliveryDate: text("delivery_date"),
  deliveryReference: text("delivery_reference"),
  deliveryTimeNotes: text("delivery_time_notes"),
  proofOfDelivery: text("proof_of_delivery").array(),
  trailerNo: text("trailer_no"),
  departureFrom: text("departure_from"),
  portOfArrival: text("port_of_arrival"),
  incoterms: text("incoterms"),
  containerShipment: boolean("container_shipment").default(false),
  vesselName: text("vessel_name"),
  
  // Clearance Agents
  exportClearanceAgent: text("export_clearance_agent").notNull(),
  arrivalClearanceAgent: text("arrival_clearance_agent").notNull(),
  
  // Cargo Details
  supplier: text("supplier"),
  consignee: text("consignee"),
  value: text("value"),
  numberOfPieces: text("number_of_pieces"),
  packaging: text("packaging"),
  goodsDescription: text("goods_description"),
  weight: text("weight"),
  cube: text("cube"),
  
  // Rate Fields
  freightRateOut: text("freight_rate_out"),
  clearanceCharge: text("clearance_charge"),
  arrivalClearanceCost: text("arrival_clearance_cost"),
  currency: text("currency"),
  additionalCommodityCodes: integer("additional_commodity_codes"),
  
  // Haulier Information
  haulierName: text("haulier_name"),
  haulierContactName: text("haulier_contact_name"),
  
  // File Attachments (stored as array of file paths from object storage)
  attachments: text("attachments").array(),
  
  // Link to auto-created customs clearance
  linkedClearanceId: varchar("linked_clearance_id"),
});

export const insertExportShipmentSchema = createInsertSchema(exportShipments).omit({
  id: true,
  jobRef: true,
}).extend({
  destinationCustomerId: z.string().nullable().refine(
    (val) => val !== null && val !== undefined && val.length > 0,
    { message: "Export Customer is required" }
  ),
  receiverId: z.string().nullable().refine(
    (val) => val !== null && val !== undefined && val.length > 0,
    { message: "Export Receiver is required" }
  ),
  bookingDate: z.string().nullable().refine(
    (val) => val !== null && val !== undefined && val.length > 0,
    { message: "Booking Date is required" }
  ),
  approxLoadDate: z.string().nullable().refine(
    (val) => val !== null && val !== undefined && val.length > 0,
    { message: "Approx Load Date is required" }
  ),
  exportClearanceAgent: z.string().min(1, "Export Clearance Agent is required"),
  arrivalClearanceAgent: z.string().min(1, "Arrival Clearance Agent is required"),
});

export type InsertExportShipment = z.infer<typeof insertExportShipmentSchema>;
export type ExportShipment = typeof exportShipments.$inferSelect;

// Custom Clearances Database
export const customClearances = pgTable("custom_clearances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobRef: integer("job_ref").notNull(),
  jobType: text("job_type").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_DATE`),
  
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
  incoterms: text("incoterms"),
  customerReferenceNumber: text("customer_reference_number"),
  supplierName: text("supplier_name"),
  
  // File Attachments (stored as array of file paths from object storage)
  attachments: text("attachments").array(),
  
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