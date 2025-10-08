import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, jsonb, numeric, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  email: text("email"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  
  // Gmail OAuth fields
  gmailAccessToken: text("gmail_access_token"),
  gmailRefreshToken: text("gmail_refresh_token"),
  gmailTokenExpiry: text("gmail_token_expiry"),
  gmailEmail: text("gmail_email"),
  
  // Email signature (uses file upload)
  useSignature: boolean("use_signature").default(false).notNull(),
  
  // Presence tracking
  lastActivity: text("last_activity"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  gmailAccessToken: true,
  gmailRefreshToken: true,
  gmailTokenExpiry: true,
  gmailEmail: true,
});

// Update schema allows all fields except id
export const updateUserSchema = createInsertSchema(users).omit({
  id: true,
}).partial();

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;

// Messages Database
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull(),
  recipientId: varchar("recipient_id").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  attachments: text("attachments").array().default([]),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Import Customers Database
export const importCustomers = pgTable("import_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Contact Information
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").array(),
  vatNumber: text("vat_number"),
  telephone: text("telephone"),
  email: text("email").array(),
  accountsEmail: text("accounts_email").array(),
  address: text("address"),
  
  // Agent Information
  agentName: text("agent_name"),
  agentContactName: text("agent_contact_name").array(),
  agentVatNumber: text("agent_vat_number"),
  agentTelephone: text("agent_telephone"),
  agentEmail: text("agent_email").array(),
  agentAccountsEmail: text("agent_accounts_email").array(),
  agentAddress: text("agent_address"),
  
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
  contactName: text("contact_name").array(),
  vatNumber: text("vat_number"),
  telephone: text("telephone"),
  email: text("email").array(),
  accountsEmail: text("accounts_email").array(),
  address: text("address"),
  
  // Agent Information
  agentName: text("agent_name"),
  agentContactName: text("agent_contact_name").array(),
  agentVatNumber: text("agent_vat_number"),
  agentTelephone: text("agent_telephone"),
  agentEmail: text("agent_email").array(),
  agentAccountsEmail: text("agent_accounts_email").array(),
  agentAddress: text("agent_address"),
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
  address: text("address"),
  country: text("country"),
});

export const insertExportReceiverSchema = createInsertSchema(exportReceivers).omit({
  id: true,
});

export type InsertExportReceiver = z.infer<typeof insertExportReceiverSchema>;
export type ExportReceiver = typeof exportReceivers.$inferSelect;

// Hauliers Database
export const haulierContactSchema = z.object({
  contactName: z.string(),
  contactEmail: z.string(),
  exportType: z.enum(["To", "From", "To & From"]),
  countryServiced: z.string(),
});

export type HaulierContact = z.infer<typeof haulierContactSchema>;

export const hauliers = pgTable("hauliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Contact Information
  haulierName: text("haulier_name").notNull(),
  contacts: jsonb("contacts").$type<HaulierContact[]>().notNull().default(sql`'[]'::jsonb`),
  address: text("address"),
  telephone: text("telephone"),
  mobile: text("mobile"),
});

export const insertHaulierSchema = createInsertSchema(hauliers).omit({
  id: true,
}).extend({
  contacts: z.array(haulierContactSchema).default([]),
});

export type InsertHaulier = z.infer<typeof insertHaulierSchema>;
export type Haulier = typeof hauliers.$inferSelect;

// Shipping Lines Database
export const shippingLines = pgTable("shipping_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Contact Information
  shippingLineName: text("shipping_line_name").notNull(),
  shippingLineAddress: text("shipping_line_address"),
  telephone: text("telephone"),
  importEmail: text("import_email").array(),
  exportEmail: text("export_email").array(),
  releasesEmail: text("releases_email").array(),
  accountingEmail: text("accounting_email").array(),
});

export const insertShippingLineSchema = createInsertSchema(shippingLines).omit({
  id: true,
});

export type InsertShippingLine = z.infer<typeof insertShippingLineSchema>;
export type ShippingLine = typeof shippingLines.$inferSelect;

// Clearance Agents Database
export const clearanceAgents = pgTable("clearance_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Agent Information
  agentName: text("agent_name").notNull(),
  agentTelephone: text("agent_telephone"),
  agentImportEmail: text("agent_import_email").array(),
  agentExportEmail: text("agent_export_email").array(),
  agentAccountingEmail: text("agent_accounting_email").array(),
});

export const insertClearanceAgentSchema = createInsertSchema(clearanceAgents).omit({
  id: true,
});

export type InsertClearanceAgent = z.infer<typeof insertClearanceAgentSchema>;
export type ClearanceAgent = typeof clearanceAgents.$inferSelect;

// Settings Database
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Financial Charges
  importClearanceFee: numeric("import_clearance_fee", { precision: 10, scale: 2 }),
  inventoryLinkedFee: numeric("inventory_linked_fee", { precision: 10, scale: 2 }),
  commodityCodesIncludedFree: integer("commodity_codes_included_free"),
  additionalCommodityCodeCharge: numeric("additional_commodity_code_charge", { precision: 10, scale: 2 }),
  defermentChargeMinimum: numeric("deferment_charge_minimum", { precision: 10, scale: 2 }),
  defermentChargePercentage: numeric("deferment_charge_percentage", { precision: 5, scale: 2 }),
  handoverFee: numeric("handover_fee", { precision: 10, scale: 2 }),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
}).extend({
  importClearanceFee: z.union([z.string(), z.number()]).nullable().optional(),
  inventoryLinkedFee: z.union([z.string(), z.number()]).nullable().optional(),
  commodityCodesIncludedFree: z.number().nullable().optional(),
  additionalCommodityCodeCharge: z.union([z.string(), z.number()]).nullable().optional(),
  defermentChargeMinimum: z.union([z.string(), z.number()]).nullable().optional(),
  defermentChargePercentage: z.union([z.string(), z.number()]).nullable().optional(),
  handoverFee: z.union([z.string(), z.number()]).nullable().optional(),
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

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
  jobContactName: text("job_contact_name").array(),
  jobContactEmail: text("job_contact_email").array(),
  
  // Shipment Details
  bookingDate: text("booking_date"),
  collectionDate: text("collection_date"),
  dispatchDate: text("dispatch_date"),
  deliveryDate: text("delivery_date"),
  deliveryTime: text("delivery_time"),
  deliveryReference: text("delivery_reference"),
  deliveryTimeNotes: text("delivery_time_notes"),
  proofOfDelivery: text("proof_of_delivery").array(),
  importDateEtaPort: text("import_date_eta_port"),
  portOfArrival: text("port_of_arrival"),
  trailerOrContainerNumber: text("trailer_or_container_number"),
  departureCountry: text("departure_country"),
  containerShipment: text("container_shipment"),
  handoverContainerAtPort: boolean("handover_container_at_port").default(false),
  vesselName: text("vessel_name"),
  shippingLine: text("shipping_line"),
  deliveryRelease: text("delivery_release"),
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
  freightRateOut: text("freight_rate_out"),
  exportCustomsClearanceCharge: text("export_customs_clearance_charge"),
  additionalCommodityCodes: integer("additional_commodity_codes"),
  additionalCommodityCodeCharge: text("additional_commodity_code_charge"),
  expensesToChargeOut: jsonb("expenses_to_charge_out").$type<Array<{description: string, amount: string}>>().default([]),
  currencyIn: text("currency_in"),
  haulierFreightRateIn: text("haulier_freight_rate_in"),
  exportClearanceChargeIn: text("export_clearance_charge_in"),
  destinationClearanceCostIn: text("destination_clearance_cost_in"),
  additionalExpensesIn: jsonb("additional_expenses_in").$type<Array<{description: string, amount: string}>>().default([]),
  
  // Haulier Information
  haulierName: text("haulier_name"),
  haulierContactName: text("haulier_contact_name").array(),
  haulierEmail: text("haulier_email").array(),
  haulierTelephone: text("haulier_telephone"),
  haulierReference: text("haulier_reference"),
  
  // Customs Details
  vatZeroRated: boolean("vat_zero_rated").default(false),
  clearanceType: text("clearance_type"),
  customsClearanceAgent: text("customs_clearance_agent"),
  rsToClear: boolean("rs_to_clear").default(false),
  clearanceStatusIndicator: integer("clearance_status_indicator").default(1),
  clearanceStatusIndicatorTimestamp: text("clearance_status_indicator_timestamp"),
  deliveryBookedStatusIndicator: integer("delivery_booked_status_indicator").default(1),
  deliveryBookedStatusIndicatorTimestamp: text("delivery_booked_status_indicator_timestamp"),
  haulierBookingStatusIndicator: integer("haulier_booking_status_indicator").default(1),
  haulierBookingStatusIndicatorTimestamp: text("haulier_booking_status_indicator_timestamp"),
  containerReleaseStatusIndicator: integer("container_release_status_indicator").default(1),
  containerReleaseStatusIndicatorTimestamp: text("container_release_status_indicator_timestamp"),
  invoiceCustomerStatusIndicator: integer("invoice_customer_status_indicator").default(1),
  invoiceCustomerStatusIndicatorTimestamp: text("invoice_customer_status_indicator_timestamp"),
  sendPodToCustomerStatusIndicator: integer("send_pod_to_customer_status_indicator").default(1),
  sendPodToCustomerStatusIndicatorTimestamp: text("send_pod_to_customer_status_indicator_timestamp"),
  sendHaulierEadStatusIndicator: integer("send_haulier_ead_status_indicator").default(1),
  sendHaulierEadStatusIndicatorTimestamp: text("send_haulier_ead_status_indicator_timestamp"),
  
  // Additional Details
  customerReferenceNumber: text("customer_reference_number"),
  deliveryAddress: text("delivery_address"),
  supplierName: text("supplier_name"),
  
  // Collection Information
  collectionAddress: text("collection_address"),
  collectionContactName: text("collection_contact_name"),
  collectionContactTelephone: text("collection_contact_telephone"),
  collectionContactEmail: text("collection_contact_email"),
  collectionReference: text("collection_reference"),
  collectionNotes: text("collection_notes"),
  
  // Additional Notes
  additionalNotes: text("additional_notes"),
  jobTags: text("job_tags").array(),
  
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
  bookingDate: z.string().nullable().refine(
    (val) => val !== null && val !== undefined && val.length > 0,
    { message: "Booking Date is required" }
  ),
  portOfArrival: z.string().nullable().refine(
    (val) => val !== null && val !== undefined && val.length > 0,
    { message: "Port of Arrival is required" }
  ),
  trailerOrContainerNumber: z.string().nullable().refine(
    (val) => val !== null && val !== undefined && val.length > 0,
    { message: "Trailer Number / Container Number is required" }
  ),
  departureCountry: z.string().nullable().refine(
    (val) => val !== null && val !== undefined && val.length > 0,
    { message: "Departure Country is required" }
  ),
  incoterms: z.string().nullable().refine(
    (val) => val !== null && val !== undefined && val.length > 0,
    { message: "Incoterms is required" }
  ),
  containerShipment: z.string().nullable().refine(
    (val) => val !== null && val !== undefined && val.length > 0,
    { message: "Shipment Type is required" }
  ),
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
  jobContactName: text("job_contact_name").array(),
  jobContactEmail: text("job_contact_email").array(),
  customerReferenceNumber: text("customer_reference_number"),
  
  // Shipment Details
  bookingDate: text("booking_date"),
  collectionDate: text("collection_date"),
  dispatchDate: text("dispatch_date"),
  etaPortDate: text("eta_port_date"),
  deliveryDate: text("delivery_date"),
  deliveryTime: text("delivery_time"),
  deliveryReference: text("delivery_reference"),
  deliveryTimeNotes: text("delivery_time_notes"),
  proofOfDelivery: text("proof_of_delivery").array(),
  trailerNo: text("trailer_no"),
  departureFrom: text("departure_from"),
  portOfArrival: text("port_of_arrival"),
  incoterms: text("incoterms"),
  containerShipment: text("container_shipment"),
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
  additionalCommodityCodeCharge: text("additional_commodity_code_charge"),
  currencyIn: text("currency_in"),
  haulierFreightRateIn: text("haulier_freight_rate_in"),
  exportClearanceChargeIn: text("export_clearance_charge_in"),
  destinationClearanceCostIn: text("destination_clearance_cost_in"),
  expensesToChargeOut: jsonb("expenses_to_charge_out").$type<Array<{description: string, amount: string}>>().default([]),
  additionalExpensesIn: jsonb("additional_expenses_in").$type<Array<{description: string, amount: string}>>().default([]),
  
  // Haulier Information
  haulierName: text("haulier_name"),
  haulierContactName: text("haulier_contact_name").array(),
  haulierEmail: text("haulier_email").array(),
  haulierTelephone: text("haulier_telephone"),
  haulierReference: text("haulier_reference"),
  
  // Additional Details
  deliveryAddress: text("delivery_address"),
  clearanceType: text("clearance_type"),
  
  // Collection Information
  collectionAddress: text("collection_address"),
  collectionContactName: text("collection_contact_name"),
  collectionContactTelephone: text("collection_contact_telephone"),
  collectionContactEmail: text("collection_contact_email"),
  collectionReference: text("collection_reference"),
  collectionNotes: text("collection_notes"),
  
  // Additional Notes
  additionalNotes: text("additional_notes"),
  jobTags: text("job_tags").array(),
  
  // File Attachments (stored as array of file paths from object storage)
  attachments: text("attachments").array(),
  
  // Link to auto-created customs clearance
  linkedClearanceId: varchar("linked_clearance_id"),
  
  // Status Indicators (1=yellow/To Do, 3=green/Done, 4=red/Issue, null=not set)
  bookJobWithHaulierStatusIndicator: integer("book_job_with_haulier_status_indicator").default(1),
  bookJobWithHaulierStatusIndicatorTimestamp: text("book_job_with_haulier_status_indicator_timestamp"),
  adviseClearanceToAgentStatusIndicator: integer("advise_clearance_to_agent_status_indicator").default(1),
  adviseClearanceToAgentStatusIndicatorTimestamp: text("advise_clearance_to_agent_status_indicator_timestamp"),
  sendHaulierEadStatusIndicator: integer("send_haulier_ead_status_indicator").default(1),
  sendHaulierEadStatusIndicatorTimestamp: text("send_haulier_ead_status_indicator_timestamp"),
  invoiceCustomerStatusIndicator: integer("invoice_customer_status_indicator").default(1),
  invoiceCustomerStatusIndicatorTimestamp: text("invoice_customer_status_indicator_timestamp"),
  sendPodToCustomerStatusIndicator: integer("send_pod_to_customer_status_indicator").default(1),
  sendPodToCustomerStatusIndicatorTimestamp: text("send_pod_to_customer_status_indicator_timestamp"),
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
  portOfArrival: z.string().nullable().refine(
    (val) => val !== null && val !== undefined && val.length > 0,
    { message: "Port of Arrival is required" }
  ),
  departureFrom: z.string().nullable().refine(
    (val) => val !== null && val !== undefined && val.length > 0,
    { message: "Departure From is required" }
  ),
  trailerNo: z.string().nullable().refine(
    (val) => val !== null && val !== undefined && val.length > 0,
    { message: "Trailer Number / Container Number is required" }
  ),
  containerShipment: z.string().nullable().refine(
    (val) => val !== null && val !== undefined && val.length > 0,
    { message: "Shipment Type is required" }
  ),
  exportClearanceAgent: z.string().min(1, "Export Clearance Agent is required"),
  arrivalClearanceAgent: z.string().min(1, "Arrival Clearance Agent is required"),
  haulierReference: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  // Check conditional requirements when Export Clearance Agent is R.S
  if (data.exportClearanceAgent === "R.S") {
    if (!data.clearanceType || data.clearanceType.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Clearance Type is required when Export Clearance Agent is R.S",
        path: ["clearanceType"],
      });
    }
    if (data.additionalCommodityCodes === undefined || data.additionalCommodityCodes === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Total Commodity Codes is required when Export Clearance Agent is R.S",
        path: ["additionalCommodityCodes"],
      });
    }
  }
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
  status: text("status").notNull().default("Request CC"),
  
  // Customer References
  importCustomerId: varchar("import_customer_id"),
  exportCustomerId: varchar("export_customer_id"),
  receiverId: varchar("receiver_id"),
  
  // Shipment Details
  etaPort: text("eta_port"),
  portOfArrival: text("port_of_arrival"),
  trailerOrContainerNumber: text("trailer_or_container_number"),
  departureFrom: text("departure_from"),
  containerShipment: text("container_shipment"),
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
  deliveryAddress: text("delivery_address"),
  
  // Additional Notes
  additionalNotes: text("additional_notes"),
  
  // File Attachments (stored as array of file paths from object storage)
  transportDocuments: text("transport_documents").array(),
  clearanceDocuments: text("clearance_documents").array(),
  
  // Status Indicators (1=yellow, 2=orange, 3=green, 4=red)
  adviseAgentStatusIndicator: integer("advise_agent_status_indicator").default(1),
  adviseAgentStatusIndicatorTimestamp: text("advise_agent_status_indicator_timestamp"),
  sendHaulierEadStatusIndicator: integer("send_haulier_ead_status_indicator").default(1),
  sendHaulierEadStatusIndicatorTimestamp: text("send_haulier_ead_status_indicator_timestamp"),
  sendHaulierClearanceDocStatusIndicator: integer("send_haulier_clearance_doc_status_indicator").default(1),
  sendHaulierClearanceDocStatusIndicatorTimestamp: text("send_haulier_clearance_doc_status_indicator_timestamp"),
  sendEntryToCustomerStatusIndicator: integer("send_entry_to_customer_status_indicator").default(1),
  sendEntryToCustomerStatusIndicatorTimestamp: text("send_entry_to_customer_status_indicator_timestamp"),
  invoiceCustomerStatusIndicator: integer("invoice_customer_status_indicator").default(1),
  invoiceCustomerStatusIndicatorTimestamp: text("invoice_customer_status_indicator_timestamp"),
  sendClearedEntryStatusIndicator: integer("send_cleared_entry_status_indicator").default(1),
  sendClearedEntryStatusIndicatorTimestamp: text("send_cleared_entry_status_indicator_timestamp"),
  
  // Link to source shipment
  createdFromType: text("created_from_type"),
  createdFromId: varchar("created_from_id"),
});

export const insertCustomClearanceSchema = createInsertSchema(customClearances).omit({
  id: true,
  jobRef: true,
}).extend({
  jobType: z.string().min(1, "Job Type is required"),
  status: z.string().min(1, "Status is required"),
  importCustomerId: z.string().nullable().optional(),
  exportCustomerId: z.string().nullable().optional(),
  receiverId: z.string().nullable().optional(),
  etaPort: z.string().nullable().optional(),
  trailerOrContainerNumber: z.string().nullable().optional(),
  vesselName: z.string().nullable().optional(),
  cube: z.string().nullable().optional(),
  transportCosts: z.string().nullable().optional(),
  clearanceCharge: z.string().nullable().optional(),
  incoterms: z.string().nullable().optional(),
  customerReferenceNumber: z.string().nullable().optional(),
  deliveryAddress: z.string().nullable().optional(),
  supplierName: z.string().nullable().optional(),
  portOfArrival: z.string().min(1, "Port Of Arrival is required"),
  departureFrom: z.string().min(1, "Departure From is required"),
  containerShipment: z.string().min(1, "Shipment Type is required"),
  numberOfPieces: z.string().min(1, "Number Of Pieces is required"),
  packaging: z.string().min(1, "Packaging is required"),
  weight: z.string().min(1, "Weight is required"),
  goodsDescription: z.string().min(1, "Goods Description is required"),
  currency: z.string().min(1, "Currency is required"),
  invoiceValue: z.string().min(1, "Invoice Value is required"),
  clearanceType: z.string().nullable().optional(),
});

export type InsertCustomClearance = z.infer<typeof insertCustomClearanceSchema>;
export type CustomClearance = typeof customClearances.$inferSelect;

// Job File Groups - Shared file storage for linked jobs (import/export + their custom clearances)
export const jobFileGroups = pgTable("job_file_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobRef: integer("job_ref").notNull().unique(), // Unique constraint ensures one record per jobRef
  
  // Shared Documents and Invoices
  documents: text("documents").array().default([]),
  rsInvoices: text("rs_invoices").array().default([]),
  
  // Timestamps
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertJobFileGroupSchema = createInsertSchema(jobFileGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertJobFileGroup = z.infer<typeof insertJobFileGroupSchema>;
export type JobFileGroup = typeof jobFileGroups.$inferSelect;

// Purchase Invoices (Expense Invoices)
export const purchaseInvoices = pgTable("purchase_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobRef: integer("job_ref").notNull(),
  companyName: text("company_name").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  invoiceDate: text("invoice_date").notNull(),
  invoiceAmount: doublePrecision("invoice_amount").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertPurchaseInvoiceSchema = createInsertSchema(purchaseInvoices).omit({
  id: true,
  createdAt: true,
});

export type InsertPurchaseInvoice = z.infer<typeof insertPurchaseInvoiceSchema>;
export type PurchaseInvoice = typeof purchaseInvoices.$inferSelect;

// Invoices (Customer/Sales Invoices)
export const invoiceLineItemSchema = z.object({
  description: z.string(),
  chargeAmount: z.string(), // Store as string for precision
  vatAmount: z.string(),
  vatCode: z.string(), // "1" = 0%, "2" = 20% standard, "3" = exempt
});

export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;

export const shipmentLineSchema = z.object({
  numberOfPackages: z.string(),
  packingType: z.string(),
  commodity: z.string(),
  kgs: z.string(),
  cbm: z.string(),
});

export type ShipmentLine = z.infer<typeof shipmentLineSchema>;

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Invoice identification
  invoiceNumber: integer("invoice_number").notNull().unique(),
  type: text("type").notNull().default("invoice"), // "invoice" or "credit_note"
  invoiceDate: text("invoice_date").notNull(),
  taxPointDate: text("tax_point_date"),
  
  // Job reference
  jobRef: integer("job_ref").notNull(),
  jobType: text("job_type").notNull(), // "import", "export", "clearance"
  jobId: varchar("job_id").notNull(), // Link to specific job record
  
  // Customer information (INVOICE TO section)
  customerCompanyName: text("customer_company_name"),
  customerAddress: text("customer_address"),
  customerVatNumber: text("customer_vat_number"),
  
  // References
  ourRef: text("our_ref"), // Job reference as string
  exportersRef: text("exporters_ref"), // Customer reference number
  
  // Shipment details (middle section of invoice)
  numberOfPackages: text("number_of_packages"),
  packingType: text("packing_type"), // e.g., "Pallet(s)", "Carton(s)"
  commodity: text("commodity"),
  kgs: text("kgs"),
  cbm: text("cbm"),
  
  // Consignor/Consignee details
  consignorName: text("consignor_name"),
  consignorAddress: text("consignor_address"),
  consigneeName: text("consignee_name"),
  consigneeAddress: text("consignee_address"),
  trailerContainerNo: text("trailer_container_no"), // Identifier
  vesselFlightNo: text("vessel_flight_no"), // Vessel name
  dateOfShipment: text("date_of_shipment"),
  portLoading: text("port_loading"), // Departure from
  portDischarge: text("port_discharge"),
  deliveryTerms: text("delivery_terms"), // Incoterms
  destination: text("destination"),
  
  // Line items and details
  lineItems: jsonb("line_items").$type<InvoiceLineItem[]>().default(sql`'[]'::jsonb`),
  shipmentLines: jsonb("shipment_lines").$type<ShipmentLine[]>().default(sql`'[]'::jsonb`), // Multiple commodity lines
  shipmentDetails: text("shipment_details"),
  paymentTerms: text("payment_terms"),
  
  // Totals (all stored as numbers)
  subtotal: doublePrecision("subtotal").notNull().default(0),
  vat: doublePrecision("vat").notNull().default(0),
  total: doublePrecision("total").notNull().default(0),
  
  // Timestamps
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  invoiceNumber: true, // Auto-generated
  createdAt: true,
  updatedAt: true,
}).extend({
  lineItems: z.array(invoiceLineItemSchema).min(1, "At least one line item is required"),
  shipmentLines: z.array(shipmentLineSchema).optional(),
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;