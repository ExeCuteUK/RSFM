import { 
  type User, 
  type InsertUser,
  type UpdateUser,
  type Message,
  type InsertMessage,
  type ImportCustomer,
  type InsertImportCustomer,
  type ExportCustomer,
  type InsertExportCustomer,
  type ExportReceiver,
  type InsertExportReceiver,
  type Haulier,
  type InsertHaulier,
  type ShippingLine,
  type InsertShippingLine,
  type ClearanceAgent,
  type InsertClearanceAgent,
  type Settings,
  type InsertSettings,
  type ImportShipment,
  type InsertImportShipment,
  type ExportShipment,
  type InsertExportShipment,
  type CustomClearance,
  type InsertCustomClearance,
  type JobFileGroup,
  type InsertJobFileGroup,
  type PurchaseInvoice,
  type InsertPurchaseInvoice,
  importCustomers,
  exportCustomers,
  exportReceivers,
  hauliers,
  shippingLines,
  clearanceAgents,
  settings,
  importShipments,
  exportShipments,
  customClearances,
  jobFileGroups,
  purchaseInvoices,
  users,
  messages
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db, pool } from "./db";
import { eq, desc, sql, ilike, or } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";

export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserCount(): Promise<number>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<UpdateUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  updateUserActivity(userId: string): Promise<void>;
  getOnlineUsers(): Promise<string[]>;

  // Message methods
  getAllMessages(): Promise<Message[]>;
  getMessagesByUser(userId: string): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: string): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<boolean>;
  getUnreadCount(userId: string): Promise<number>;

  // Import Customer methods
  getAllImportCustomers(): Promise<ImportCustomer[]>;
  getImportCustomer(id: string): Promise<ImportCustomer | undefined>;
  searchImportCustomers(query: string, limit?: number): Promise<ImportCustomer[]>;
  createImportCustomer(customer: InsertImportCustomer): Promise<ImportCustomer>;
  updateImportCustomer(id: string, customer: Partial<InsertImportCustomer>): Promise<ImportCustomer | undefined>;
  deleteImportCustomer(id: string): Promise<boolean>;

  // Export Customer methods
  getAllExportCustomers(): Promise<ExportCustomer[]>;
  getExportCustomer(id: string): Promise<ExportCustomer | undefined>;
  searchExportCustomers(query: string, limit?: number): Promise<ExportCustomer[]>;
  createExportCustomer(customer: InsertExportCustomer): Promise<ExportCustomer>;
  updateExportCustomer(id: string, customer: Partial<InsertExportCustomer>): Promise<ExportCustomer | undefined>;
  deleteExportCustomer(id: string): Promise<boolean>;

  // Export Receiver methods
  getAllExportReceivers(): Promise<ExportReceiver[]>;
  getExportReceiver(id: string): Promise<ExportReceiver | undefined>;
  searchExportReceivers(query: string, limit?: number): Promise<ExportReceiver[]>;
  createExportReceiver(receiver: InsertExportReceiver): Promise<ExportReceiver>;
  updateExportReceiver(id: string, receiver: Partial<InsertExportReceiver>): Promise<ExportReceiver | undefined>;
  deleteExportReceiver(id: string): Promise<boolean>;

  // Haulier methods
  getAllHauliers(): Promise<Haulier[]>;
  getHaulier(id: string): Promise<Haulier | undefined>;
  createHaulier(haulier: InsertHaulier): Promise<Haulier>;
  updateHaulier(id: string, haulier: Partial<InsertHaulier>): Promise<Haulier | undefined>;
  deleteHaulier(id: string): Promise<boolean>;

  // Shipping Line methods
  getAllShippingLines(): Promise<ShippingLine[]>;
  getShippingLine(id: string): Promise<ShippingLine | undefined>;
  createShippingLine(shippingLine: InsertShippingLine): Promise<ShippingLine>;
  updateShippingLine(id: string, shippingLine: Partial<InsertShippingLine>): Promise<ShippingLine | undefined>;
  deleteShippingLine(id: string): Promise<boolean>;

  // Clearance Agent methods
  getAllClearanceAgents(): Promise<ClearanceAgent[]>;
  getClearanceAgent(id: string): Promise<ClearanceAgent | undefined>;
  createClearanceAgent(agent: InsertClearanceAgent): Promise<ClearanceAgent>;
  updateClearanceAgent(id: string, agent: Partial<InsertClearanceAgent>): Promise<ClearanceAgent | undefined>;
  deleteClearanceAgent(id: string): Promise<boolean>;

  // Settings methods
  getSettings(): Promise<Settings | undefined>;
  updateSettings(id: string, settingsData: Partial<InsertSettings>): Promise<Settings | undefined>;
  createSettings(settingsData: InsertSettings): Promise<Settings>;

  // Job Reference methods
  getNextJobRef(): number;

  // Import Shipment methods
  getAllImportShipments(): Promise<ImportShipment[]>;
  getImportShipment(id: string): Promise<ImportShipment | undefined>;
  createImportShipment(shipment: InsertImportShipment): Promise<ImportShipment>;
  updateImportShipment(id: string, shipment: Partial<InsertImportShipment>): Promise<ImportShipment | undefined>;
  deleteImportShipment(id: string): Promise<boolean>;

  // Export Shipment methods
  getAllExportShipments(): Promise<ExportShipment[]>;
  getExportShipment(id: string): Promise<ExportShipment | undefined>;
  createExportShipment(shipment: InsertExportShipment): Promise<ExportShipment>;
  updateExportShipment(id: string, shipment: Partial<InsertExportShipment>): Promise<ExportShipment | undefined>;
  deleteExportShipment(id: string): Promise<boolean>;

  // Custom Clearance methods
  getAllCustomClearances(): Promise<CustomClearance[]>;
  getCustomClearance(id: string): Promise<CustomClearance | undefined>;
  createCustomClearance(clearance: InsertCustomClearance): Promise<CustomClearance>;
  updateCustomClearance(id: string, clearance: Partial<InsertCustomClearance>): Promise<CustomClearance | undefined>;
  deleteCustomClearance(id: string): Promise<boolean>;

  // Job File Group methods (shared file storage for linked jobs)
  getJobFileGroupByJobRef(jobRef: number): Promise<JobFileGroup | undefined>;
  createJobFileGroup(group: InsertJobFileGroup): Promise<JobFileGroup>;
  updateJobFileGroup(jobRef: number, group: Partial<InsertJobFileGroup>): Promise<JobFileGroup | undefined>;
  deleteJobFileGroup(jobRef: number): Promise<boolean>;

  // Job History methods
  getImportShipmentsByCustomerId(customerId: string): Promise<ImportShipment[]>;
  getExportShipmentsByCustomerId(customerId: string): Promise<ExportShipment[]>;

  // Purchase Invoice methods
  getAllPurchaseInvoices(): Promise<PurchaseInvoice[]>;
  getPurchaseInvoicesByJobRef(jobRef: number): Promise<PurchaseInvoice[]>;
  getPurchaseInvoice(id: string): Promise<PurchaseInvoice | undefined>;
  createPurchaseInvoice(invoice: InsertPurchaseInvoice): Promise<PurchaseInvoice>;
  createManyPurchaseInvoices(invoices: InsertPurchaseInvoice[]): Promise<PurchaseInvoice[]>;
  updatePurchaseInvoice(id: string, invoice: Partial<InsertPurchaseInvoice>): Promise<PurchaseInvoice | undefined>;
  deletePurchaseInvoice(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private importCustomers: Map<string, ImportCustomer>;
  private exportCustomers: Map<string, ExportCustomer>;
  private exportReceivers: Map<string, ExportReceiver>;
  private importShipments: Map<string, ImportShipment>;
  private exportShipments: Map<string, ExportShipment>;
  private customClearances: Map<string, CustomClearance>;
  private jobRefCounter: number;
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.importCustomers = new Map();
    this.exportCustomers = new Map();
    this.exportReceivers = new Map();
    this.importShipments = new Map();
    this.exportShipments = new Map();
    this.customClearances = new Map();
    this.jobRefCounter = 26001;
    
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserCount(): Promise<number> {
    return this.users.size;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      fullName: insertUser.fullName ?? null,
      email: insertUser.email ?? null,
      isAdmin: insertUser.isAdmin ?? false,
      gmailAccessToken: null,
      gmailRefreshToken: null,
      gmailTokenExpiry: null,
      gmailEmail: null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<UpdateUser>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    
    const updated: User = { ...existing, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async updateUserActivity(userId: string): Promise<void> {
    // No-op for memory storage
  }

  async getOnlineUsers(): Promise<string[]> {
    // No online tracking in memory storage
    return [];
  }

  // Message methods (stubs - not used in production)
  async getAllMessages(): Promise<Message[]> {
    return [];
  }

  async getMessagesByUser(_userId: string): Promise<Message[]> {
    return [];
  }

  async getMessage(_id: string): Promise<Message | undefined> {
    return undefined;
  }

  async createMessage(_message: InsertMessage): Promise<Message> {
    throw new Error("Messages not supported in MemStorage");
  }

  async markMessageAsRead(_id: string): Promise<Message | undefined> {
    return undefined;
  }

  async deleteMessage(_id: string): Promise<boolean> {
    return false;
  }

  async getUnreadCount(_userId: string): Promise<number> {
    return 0;
  }

  // Import Customer methods
  async getAllImportCustomers(): Promise<ImportCustomer[]> {
    return Array.from(this.importCustomers.values());
  }

  async getImportCustomer(id: string): Promise<ImportCustomer | undefined> {
    return this.importCustomers.get(id);
  }

  async searchImportCustomers(query: string, limit: number = 25): Promise<ImportCustomer[]> {
    const all = Array.from(this.importCustomers.values());
    if (!query || query.trim() === '') {
      return all.sort((a, b) => a.companyName.localeCompare(b.companyName)).slice(0, limit);
    }
    const lowerQuery = query.toLowerCase();
    return all
      .filter(c => 
        c.companyName.toLowerCase().includes(lowerQuery) ||
        (c.contactName && c.contactName.some((name: string) => name.toLowerCase().includes(lowerQuery)))
      )
      .sort((a, b) => a.companyName.localeCompare(b.companyName))
      .slice(0, limit);
  }

  async createImportCustomer(insertCustomer: InsertImportCustomer): Promise<ImportCustomer> {
    const id = randomUUID();
    const customer: ImportCustomer = { 
      ...insertCustomer, 
      id,
      contactName: insertCustomer.contactName ?? null,
      vatNumber: insertCustomer.vatNumber ?? null,
      telephone: insertCustomer.telephone ?? null,
      email: insertCustomer.email ?? null,
      accountsEmail: insertCustomer.accountsEmail ?? null,
      address: insertCustomer.address ?? null,
      agentName: insertCustomer.agentName ?? null,
      agentContactName: insertCustomer.agentContactName ?? null,
      agentVatNumber: insertCustomer.agentVatNumber ?? null,
      agentTelephone: insertCustomer.agentTelephone ?? null,
      agentEmail: insertCustomer.agentEmail ?? null,
      agentAccountsEmail: insertCustomer.agentAccountsEmail ?? null,
      agentAddress: insertCustomer.agentAddress ?? null,
      rsProcessCustomsClearance: insertCustomer.rsProcessCustomsClearance ?? false,
      agentInDover: insertCustomer.agentInDover ?? null,
      vatPaymentMethod: insertCustomer.vatPaymentMethod ?? null,
      clearanceAgentDetails: insertCustomer.clearanceAgentDetails ?? null,
      defaultDeliveryAddress: insertCustomer.defaultDeliveryAddress ?? null,
      defaultSuppliersName: insertCustomer.defaultSuppliersName ?? null,
      bookingInDetails: insertCustomer.bookingInDetails ?? null,
    };
    this.importCustomers.set(id, customer);
    return customer;
  }

  async updateImportCustomer(id: string, updates: Partial<InsertImportCustomer>): Promise<ImportCustomer | undefined> {
    const existing = this.importCustomers.get(id);
    if (!existing) return undefined;
    
    const normalized = {
      ...updates,
      contactName: updates.contactName !== undefined ? updates.contactName ?? null : existing.contactName,
      vatNumber: updates.vatNumber !== undefined ? updates.vatNumber ?? null : existing.vatNumber,
      telephone: updates.telephone !== undefined ? updates.telephone ?? null : existing.telephone,
      email: updates.email !== undefined ? updates.email ?? null : existing.email,
      accountsEmail: updates.accountsEmail !== undefined ? updates.accountsEmail ?? null : existing.accountsEmail,
      address: updates.address !== undefined ? updates.address ?? null : existing.address,
      agentName: updates.agentName !== undefined ? updates.agentName ?? null : existing.agentName,
      agentContactName: updates.agentContactName !== undefined ? updates.agentContactName ?? null : existing.agentContactName,
      agentVatNumber: updates.agentVatNumber !== undefined ? updates.agentVatNumber ?? null : existing.agentVatNumber,
      agentTelephone: updates.agentTelephone !== undefined ? updates.agentTelephone ?? null : existing.agentTelephone,
      agentEmail: updates.agentEmail !== undefined ? updates.agentEmail ?? null : existing.agentEmail,
      agentAccountsEmail: updates.agentAccountsEmail !== undefined ? updates.agentAccountsEmail ?? null : existing.agentAccountsEmail,
      agentAddress: updates.agentAddress !== undefined ? updates.agentAddress ?? null : existing.agentAddress,
      rsProcessCustomsClearance: updates.rsProcessCustomsClearance !== undefined ? updates.rsProcessCustomsClearance ?? false : existing.rsProcessCustomsClearance,
      agentInDover: updates.agentInDover !== undefined ? updates.agentInDover ?? null : existing.agentInDover,
      vatPaymentMethod: updates.vatPaymentMethod !== undefined ? updates.vatPaymentMethod ?? null : existing.vatPaymentMethod,
      clearanceAgentDetails: updates.clearanceAgentDetails !== undefined ? updates.clearanceAgentDetails ?? null : existing.clearanceAgentDetails,
      defaultDeliveryAddress: updates.defaultDeliveryAddress !== undefined ? updates.defaultDeliveryAddress ?? null : existing.defaultDeliveryAddress,
      defaultSuppliersName: updates.defaultSuppliersName !== undefined ? updates.defaultSuppliersName ?? null : existing.defaultSuppliersName,
      bookingInDetails: updates.bookingInDetails !== undefined ? updates.bookingInDetails ?? null : existing.bookingInDetails,
    };
    
    const updated: ImportCustomer = { ...existing, ...normalized };
    this.importCustomers.set(id, updated);
    return updated;
  }

  async deleteImportCustomer(id: string): Promise<boolean> {
    return this.importCustomers.delete(id);
  }

  // Export Customer methods
  async getAllExportCustomers(): Promise<ExportCustomer[]> {
    return Array.from(this.exportCustomers.values());
  }

  async getExportCustomer(id: string): Promise<ExportCustomer | undefined> {
    return this.exportCustomers.get(id);
  }

  async searchExportCustomers(query: string, limit: number = 25): Promise<ExportCustomer[]> {
    const all = Array.from(this.exportCustomers.values());
    if (!query || query.trim() === '') {
      return all.sort((a, b) => a.companyName.localeCompare(b.companyName)).slice(0, limit);
    }
    const lowerQuery = query.toLowerCase();
    return all
      .filter(c => 
        c.companyName.toLowerCase().includes(lowerQuery) ||
        (c.contactName && c.contactName.some((name: string) => name.toLowerCase().includes(lowerQuery)))
      )
      .sort((a, b) => a.companyName.localeCompare(b.companyName))
      .slice(0, limit);
  }

  async createExportCustomer(insertCustomer: InsertExportCustomer): Promise<ExportCustomer> {
    const id = randomUUID();
    const customer: ExportCustomer = { 
      ...insertCustomer, 
      id,
      contactName: insertCustomer.contactName ?? null,
      vatNumber: insertCustomer.vatNumber ?? null,
      telephone: insertCustomer.telephone ?? null,
      email: insertCustomer.email ?? null,
      accountsEmail: insertCustomer.accountsEmail ?? null,
      address: insertCustomer.address ?? null,
      agentName: insertCustomer.agentName ?? null,
      agentContactName: insertCustomer.agentContactName ?? null,
      agentVatNumber: insertCustomer.agentVatNumber ?? null,
      agentTelephone: insertCustomer.agentTelephone ?? null,
      agentEmail: insertCustomer.agentEmail ?? null,
      agentAccountsEmail: insertCustomer.agentAccountsEmail ?? null,
      agentAddress: insertCustomer.agentAddress ?? null,
    };
    this.exportCustomers.set(id, customer);
    return customer;
  }

  async updateExportCustomer(id: string, updates: Partial<InsertExportCustomer>): Promise<ExportCustomer | undefined> {
    const existing = this.exportCustomers.get(id);
    if (!existing) return undefined;
    
    const normalized = {
      ...updates,
      contactName: updates.contactName !== undefined ? updates.contactName ?? null : existing.contactName,
      vatNumber: updates.vatNumber !== undefined ? updates.vatNumber ?? null : existing.vatNumber,
      telephone: updates.telephone !== undefined ? updates.telephone ?? null : existing.telephone,
      email: updates.email !== undefined ? updates.email ?? null : existing.email,
      accountsEmail: updates.accountsEmail !== undefined ? updates.accountsEmail ?? null : existing.accountsEmail,
      address: updates.address !== undefined ? updates.address ?? null : existing.address,
      agentName: updates.agentName !== undefined ? updates.agentName ?? null : existing.agentName,
      agentContactName: updates.agentContactName !== undefined ? updates.agentContactName ?? null : existing.agentContactName,
      agentVatNumber: updates.agentVatNumber !== undefined ? updates.agentVatNumber ?? null : existing.agentVatNumber,
      agentTelephone: updates.agentTelephone !== undefined ? updates.agentTelephone ?? null : existing.agentTelephone,
      agentEmail: updates.agentEmail !== undefined ? updates.agentEmail ?? null : existing.agentEmail,
      agentAccountsEmail: updates.agentAccountsEmail !== undefined ? updates.agentAccountsEmail ?? null : existing.agentAccountsEmail,
      agentAddress: updates.agentAddress !== undefined ? updates.agentAddress ?? null : existing.agentAddress,
    };
    
    const updated: ExportCustomer = { ...existing, ...normalized };
    this.exportCustomers.set(id, updated);
    return updated;
  }

  async deleteExportCustomer(id: string): Promise<boolean> {
    return this.exportCustomers.delete(id);
  }

  // Export Receiver methods
  async getAllExportReceivers(): Promise<ExportReceiver[]> {
    return Array.from(this.exportReceivers.values());
  }

  async getExportReceiver(id: string): Promise<ExportReceiver | undefined> {
    return this.exportReceivers.get(id);
  }

  async searchExportReceivers(query: string, limit: number = 25): Promise<ExportReceiver[]> {
    const all = Array.from(this.exportReceivers.values());
    if (!query || query.trim() === '') {
      return all.sort((a, b) => a.companyName.localeCompare(b.companyName)).slice(0, limit);
    }
    const lowerQuery = query.toLowerCase();
    return all
      .filter(r => r.companyName.toLowerCase().includes(lowerQuery))
      .sort((a, b) => a.companyName.localeCompare(b.companyName))
      .slice(0, limit);
  }

  async createExportReceiver(insertReceiver: InsertExportReceiver): Promise<ExportReceiver> {
    const id = randomUUID();
    const receiver: ExportReceiver = { 
      ...insertReceiver, 
      id,
      address: insertReceiver.address ?? null,
      country: insertReceiver.country ?? null,
    };
    this.exportReceivers.set(id, receiver);
    return receiver;
  }

  async updateExportReceiver(id: string, updates: Partial<InsertExportReceiver>): Promise<ExportReceiver | undefined> {
    const existing = this.exportReceivers.get(id);
    if (!existing) return undefined;
    
    const normalized = {
      ...updates,
      address: updates.address !== undefined ? updates.address ?? null : existing.address,
      country: updates.country !== undefined ? updates.country ?? null : existing.country,
    };
    
    const updated: ExportReceiver = { ...existing, ...normalized };
    this.exportReceivers.set(id, updated);
    return updated;
  }

  async deleteExportReceiver(id: string): Promise<boolean> {
    return this.exportReceivers.delete(id);
  }

  // Haulier methods
  async getAllHauliers(): Promise<Haulier[]> {
    return [];
  }

  async getHaulier(id: string): Promise<Haulier | undefined> {
    return undefined;
  }

  async createHaulier(haulier: InsertHaulier): Promise<Haulier> {
    const id = randomUUID();
    const created: Haulier = {
      ...haulier,
      id,
      contacts: haulier.contacts ?? [],
      address: haulier.address ?? null,
      telephone: haulier.telephone ?? null,
      mobile: haulier.mobile ?? null,
    };
    return created;
  }

  async updateHaulier(id: string, haulier: Partial<InsertHaulier>): Promise<Haulier | undefined> {
    return undefined;
  }

  async deleteHaulier(id: string): Promise<boolean> {
    return false;
  }

  // Shipping Line methods
  async getAllShippingLines(): Promise<ShippingLine[]> {
    return [];
  }

  async getShippingLine(id: string): Promise<ShippingLine | undefined> {
    return undefined;
  }

  async createShippingLine(shippingLine: InsertShippingLine): Promise<ShippingLine> {
    const created: ShippingLine = {
      id: randomUUID(),
      shippingLineName: shippingLine.shippingLineName,
      shippingLineAddress: shippingLine.shippingLineAddress ?? null,
      telephone: shippingLine.telephone ?? null,
      importEmail: shippingLine.importEmail ?? null,
      exportEmail: shippingLine.exportEmail ?? null,
      releasesEmail: shippingLine.releasesEmail ?? null,
      accountingEmail: shippingLine.accountingEmail ?? null,
    };
    return created;
  }

  async updateShippingLine(id: string, shippingLine: Partial<InsertShippingLine>): Promise<ShippingLine | undefined> {
    return undefined;
  }

  async deleteShippingLine(id: string): Promise<boolean> {
    return false;
  }

  // Clearance Agent methods
  async getAllClearanceAgents(): Promise<ClearanceAgent[]> {
    return [];
  }

  async getClearanceAgent(id: string): Promise<ClearanceAgent | undefined> {
    return undefined;
  }

  async createClearanceAgent(agent: InsertClearanceAgent): Promise<ClearanceAgent> {
    const created: ClearanceAgent = {
      id: randomUUID(),
      agentName: agent.agentName,
      agentTelephone: agent.agentTelephone ?? null,
      agentImportEmail: agent.agentImportEmail ?? null,
      agentExportEmail: agent.agentExportEmail ?? null,
      agentAccountingEmail: agent.agentAccountingEmail ?? null,
    };
    return created;
  }

  async updateClearanceAgent(id: string, agent: Partial<InsertClearanceAgent>): Promise<ClearanceAgent | undefined> {
    return undefined;
  }

  async deleteClearanceAgent(id: string): Promise<boolean> {
    return false;
  }

  // Settings methods
  async getSettings(): Promise<Settings | undefined> {
    return undefined;
  }

  async updateSettings(id: string, settingsData: Partial<InsertSettings>): Promise<Settings | undefined> {
    return undefined;
  }

  async createSettings(settingsData: InsertSettings): Promise<Settings> {
    const toStringOrNull = (val: string | number | null | undefined): string | null => {
      if (val === null || val === undefined) return null;
      return typeof val === 'number' ? val.toString() : val;
    };
    
    const created: Settings = {
      id: randomUUID(),
      importClearanceFee: toStringOrNull(settingsData.importClearanceFee),
      inventoryLinkedFee: toStringOrNull(settingsData.inventoryLinkedFee),
      commodityCodesIncludedFree: settingsData.commodityCodesIncludedFree ?? null,
      additionalCommodityCodeCharge: toStringOrNull(settingsData.additionalCommodityCodeCharge),
      defermentChargeMinimum: toStringOrNull(settingsData.defermentChargeMinimum),
      defermentChargePercentage: toStringOrNull(settingsData.defermentChargePercentage),
      handoverFee: toStringOrNull(settingsData.handoverFee),
    };
    return created;
  }

  // Job Reference methods
  getNextJobRef(): number {
    return this.jobRefCounter++;
  }

  // Import Shipment methods
  async getAllImportShipments(): Promise<ImportShipment[]> {
    return Array.from(this.importShipments.values());
  }

  async getImportShipment(id: string): Promise<ImportShipment | undefined> {
    return this.importShipments.get(id);
  }

  async createImportShipment(insertShipment: InsertImportShipment): Promise<ImportShipment> {
    const id = randomUUID();
    const jobRef = this.getNextJobRef();
    
    const shipment: ImportShipment = {
      ...insertShipment,
      id,
      jobRef,
      jobType: "import",
      createdAt: new Date().toISOString(),
      status: insertShipment.status ?? "Pending",
      importCustomerId: insertShipment.importCustomerId ?? null,
      importDateEtaPort: insertShipment.importDateEtaPort ?? null,
      portOfArrival: insertShipment.portOfArrival ?? null,
      trailerOrContainerNumber: insertShipment.trailerOrContainerNumber ?? null,
      departureCountry: insertShipment.departureCountry ?? null,
      containerShipment: insertShipment.containerShipment ?? null,
      vesselName: insertShipment.vesselName ?? null,
      incoterms: insertShipment.incoterms ?? null,
      numberOfPieces: insertShipment.numberOfPieces ?? null,
      packaging: insertShipment.packaging ?? null,
      weight: insertShipment.weight ?? null,
      cube: insertShipment.cube ?? null,
      goodsDescription: insertShipment.goodsDescription ?? null,
      invoiceValue: insertShipment.invoiceValue ?? null,
      freightCharge: insertShipment.freightCharge ?? null,
      clearanceCharge: insertShipment.clearanceCharge ?? null,
      currency: insertShipment.currency ?? null,
      additionalCommodityCodes: insertShipment.additionalCommodityCodes ?? null,
      vatZeroRated: insertShipment.vatZeroRated ?? false,
      clearanceType: insertShipment.clearanceType ?? null,
      customsClearanceAgent: insertShipment.customsClearanceAgent ?? null,
      rsToClear: insertShipment.rsToClear ?? false,
      customerReferenceNumber: insertShipment.customerReferenceNumber ?? null,
      deliveryAddress: insertShipment.deliveryAddress ?? null,
      supplierName: insertShipment.supplierName ?? null,
      attachments: insertShipment.attachments ?? null,
      linkedClearanceId: null,
    };

    this.importShipments.set(id, shipment);

    if (shipment.rsToClear) {
      const clearanceId = randomUUID();
      const clearance: CustomClearance = {
        id: clearanceId,
        jobRef: shipment.jobRef,
        jobType: "import",
        createdAt: new Date().toISOString(),
        status: "Awaiting Entry",
        importCustomerId: shipment.importCustomerId,
        exportCustomerId: null,
        receiverId: null,
        etaPort: shipment.importDateEtaPort,
        portOfArrival: shipment.portOfArrival,
        trailerOrContainerNumber: shipment.trailerOrContainerNumber,
        departureFrom: shipment.departureCountry,
        containerShipment: shipment.containerShipment,
        vesselName: shipment.vesselName,
        numberOfPieces: shipment.numberOfPieces,
        packaging: shipment.packaging,
        weight: shipment.weight,
        cube: shipment.cube,
        goodsDescription: shipment.goodsDescription,
        invoiceValue: shipment.invoiceValue,
        transportCosts: shipment.freightCharge,
        clearanceCharge: shipment.clearanceCharge,
        currency: shipment.currency,
        additionalCommodityCodes: shipment.additionalCommodityCodes,
        vatZeroRated: shipment.vatZeroRated,
        clearanceType: shipment.clearanceType,
        incoterms: null,
        customerReferenceNumber: shipment.customerReferenceNumber,
        supplierName: shipment.supplierName,
        deliveryAddress: null,
        additionalNotes: null,
        transportDocuments: null,
        clearanceDocuments: null,
        adviseAgentStatusIndicator: 2,
        sendHaulierEadStatusIndicator: 2,
        sendHaulierClearanceDocStatusIndicator: 2,
        sendEntryToCustomerStatusIndicator: 2,
        invoiceCustomerStatusIndicator: 2,
        sendClearedEntryStatusIndicator: 2,
        createdFromType: "import",
        createdFromId: shipment.id,
      };

      this.customClearances.set(clearanceId, clearance);
      
      shipment.linkedClearanceId = clearanceId;
      this.importShipments.set(id, shipment);
    }

    return shipment;
  }

  async updateImportShipment(id: string, updates: Partial<InsertImportShipment>): Promise<ImportShipment | undefined> {
    const existing = this.importShipments.get(id);
    if (!existing) return undefined;

    // If rsToClear is being changed from true to false, delete the linked clearance
    if (existing.rsToClear && updates.rsToClear === false && existing.linkedClearanceId) {
      this.customClearances.delete(existing.linkedClearanceId);
      updates.linkedClearanceId = null;
    }

    const updated: ImportShipment = { 
      ...existing, 
      ...updates,
      status: updates.status !== undefined ? updates.status ?? "Pending" : existing.status,
      importCustomerId: updates.importCustomerId !== undefined ? updates.importCustomerId ?? null : existing.importCustomerId,
      importDateEtaPort: updates.importDateEtaPort !== undefined ? updates.importDateEtaPort ?? null : existing.importDateEtaPort,
      portOfArrival: updates.portOfArrival !== undefined ? updates.portOfArrival ?? null : existing.portOfArrival,
      trailerOrContainerNumber: updates.trailerOrContainerNumber !== undefined ? updates.trailerOrContainerNumber ?? null : existing.trailerOrContainerNumber,
      departureCountry: updates.departureCountry !== undefined ? updates.departureCountry ?? null : existing.departureCountry,
      containerShipment: updates.containerShipment !== undefined ? updates.containerShipment ?? null : existing.containerShipment,
      vesselName: updates.vesselName !== undefined ? updates.vesselName ?? null : existing.vesselName,
      incoterms: updates.incoterms !== undefined ? updates.incoterms ?? null : existing.incoterms,
      numberOfPieces: updates.numberOfPieces !== undefined ? updates.numberOfPieces ?? null : existing.numberOfPieces,
      packaging: updates.packaging !== undefined ? updates.packaging ?? null : existing.packaging,
      weight: updates.weight !== undefined ? updates.weight ?? null : existing.weight,
      cube: updates.cube !== undefined ? updates.cube ?? null : existing.cube,
      goodsDescription: updates.goodsDescription !== undefined ? updates.goodsDescription ?? null : existing.goodsDescription,
      invoiceValue: updates.invoiceValue !== undefined ? updates.invoiceValue ?? null : existing.invoiceValue,
      freightCharge: updates.freightCharge !== undefined ? updates.freightCharge ?? null : existing.freightCharge,
      clearanceCharge: updates.clearanceCharge !== undefined ? updates.clearanceCharge ?? null : existing.clearanceCharge,
      currency: updates.currency !== undefined ? updates.currency ?? null : existing.currency,
      additionalCommodityCodes: updates.additionalCommodityCodes !== undefined ? updates.additionalCommodityCodes ?? null : existing.additionalCommodityCodes,
      vatZeroRated: updates.vatZeroRated !== undefined ? updates.vatZeroRated ?? false : existing.vatZeroRated,
      clearanceType: updates.clearanceType !== undefined ? updates.clearanceType ?? null : existing.clearanceType,
      customsClearanceAgent: updates.customsClearanceAgent !== undefined ? updates.customsClearanceAgent ?? null : existing.customsClearanceAgent,
      rsToClear: updates.rsToClear !== undefined ? updates.rsToClear ?? false : existing.rsToClear,
      customerReferenceNumber: updates.customerReferenceNumber !== undefined ? updates.customerReferenceNumber ?? null : existing.customerReferenceNumber,
      deliveryAddress: updates.deliveryAddress !== undefined ? updates.deliveryAddress ?? null : existing.deliveryAddress,
      supplierName: updates.supplierName !== undefined ? updates.supplierName ?? null : existing.supplierName,
      attachments: updates.attachments !== undefined ? updates.attachments ?? null : existing.attachments,
    };

    // If rsToClear is true and there's no linked clearance, create one
    if (updated.rsToClear === true && !existing.linkedClearanceId) {
      const clearanceId = randomUUID();
      const clearance: CustomClearance = {
        id: clearanceId,
        jobRef: existing.jobRef,
        jobType: "import",
        createdAt: new Date().toISOString(),
        status: "Awaiting Entry",
        importCustomerId: updated.importCustomerId,
        exportCustomerId: null,
        receiverId: null,
        etaPort: updated.importDateEtaPort,
        portOfArrival: updated.portOfArrival,
        trailerOrContainerNumber: updated.trailerOrContainerNumber,
        departureFrom: updated.departureCountry,
        containerShipment: updated.containerShipment,
        vesselName: updated.vesselName,
        numberOfPieces: updated.numberOfPieces,
        packaging: updated.packaging,
        weight: updated.weight,
        cube: updated.cube,
        goodsDescription: updated.goodsDescription,
        invoiceValue: updated.invoiceValue,
        transportCosts: updated.freightCharge,
        clearanceCharge: updated.clearanceCharge,
        currency: updated.currency,
        additionalCommodityCodes: updated.additionalCommodityCodes,
        vatZeroRated: updated.vatZeroRated,
        clearanceType: updated.clearanceType,
        incoterms: null,
        customerReferenceNumber: updated.customerReferenceNumber,
        supplierName: updated.supplierName,
        deliveryAddress: null,
        additionalNotes: null,
        transportDocuments: null,
        clearanceDocuments: null,
        adviseAgentStatusIndicator: 2,
        sendHaulierEadStatusIndicator: 2,
        sendHaulierClearanceDocStatusIndicator: 2,
        sendEntryToCustomerStatusIndicator: 2,
        invoiceCustomerStatusIndicator: 2,
        sendClearedEntryStatusIndicator: 2,
        createdFromType: "import",
        createdFromId: existing.id,
      };

      this.customClearances.set(clearanceId, clearance);
      updated.linkedClearanceId = clearanceId;
    }
    
    this.importShipments.set(id, updated);
    return updated;
  }

  async deleteImportShipment(id: string): Promise<boolean> {
    return this.importShipments.delete(id);
  }

  // Export Shipment methods
  async getAllExportShipments(): Promise<ExportShipment[]> {
    return Array.from(this.exportShipments.values());
  }

  async getExportShipment(id: string): Promise<ExportShipment | undefined> {
    return this.exportShipments.get(id);
  }

  async createExportShipment(insertShipment: InsertExportShipment): Promise<ExportShipment> {
    const id = randomUUID();
    const jobRef = this.getNextJobRef();
    
    const shipment: ExportShipment = {
      ...insertShipment,
      id,
      jobRef,
      jobType: "export",
      createdAt: new Date().toISOString(),
      status: insertShipment.status ?? "Pending",
      receiverId: insertShipment.receiverId ?? null,
      destinationCustomerId: insertShipment.destinationCustomerId ?? null,
      customerReferenceNumber: insertShipment.customerReferenceNumber ?? null,
      bookingDate: insertShipment.bookingDate ?? null,
      trailerNo: insertShipment.trailerNo ?? null,
      departureFrom: insertShipment.departureFrom ?? null,
      portOfArrival: insertShipment.portOfArrival ?? null,
      incoterms: insertShipment.incoterms ?? null,
      containerShipment: insertShipment.containerShipment ?? null,
      vesselName: insertShipment.vesselName ?? null,
      exportClearanceAgent: insertShipment.exportClearanceAgent,
      arrivalClearanceAgent: insertShipment.arrivalClearanceAgent,
      supplier: insertShipment.supplier ?? null,
      consignee: insertShipment.consignee ?? null,
      value: insertShipment.value ?? null,
      numberOfPieces: insertShipment.numberOfPieces ?? null,
      packaging: insertShipment.packaging ?? null,
      goodsDescription: insertShipment.goodsDescription ?? null,
      weight: insertShipment.weight ?? null,
      cube: insertShipment.cube ?? null,
      freightRateOut: insertShipment.freightRateOut ?? null,
      clearanceCharge: insertShipment.clearanceCharge ?? null,
      arrivalClearanceCost: insertShipment.arrivalClearanceCost ?? null,
      currency: insertShipment.currency ?? null,
      additionalCommodityCodes: insertShipment.additionalCommodityCodes ?? null,
      haulierName: insertShipment.haulierName ?? null,
      haulierContactName: insertShipment.haulierContactName ?? null,
      attachments: insertShipment.attachments ?? null,
      linkedClearanceId: insertShipment.linkedClearanceId ?? null,
    };

    this.exportShipments.set(id, shipment);
    return shipment;
  }

  async updateExportShipment(id: string, updates: Partial<InsertExportShipment>): Promise<ExportShipment | undefined> {
    const existing = this.exportShipments.get(id);
    if (!existing) return undefined;

    const updated: ExportShipment = { 
      ...existing, 
      ...updates,
      status: updates.status !== undefined ? updates.status ?? "Pending" : existing.status,
      receiverId: updates.receiverId !== undefined ? updates.receiverId ?? null : existing.receiverId,
      destinationCustomerId: updates.destinationCustomerId !== undefined ? updates.destinationCustomerId ?? null : existing.destinationCustomerId,
      customerReferenceNumber: updates.customerReferenceNumber !== undefined ? updates.customerReferenceNumber ?? null : existing.customerReferenceNumber,
      bookingDate: updates.bookingDate !== undefined ? updates.bookingDate ?? null : existing.bookingDate,
      trailerNo: updates.trailerNo !== undefined ? updates.trailerNo ?? null : existing.trailerNo,
      departureFrom: updates.departureFrom !== undefined ? updates.departureFrom ?? null : existing.departureFrom,
      portOfArrival: updates.portOfArrival !== undefined ? updates.portOfArrival ?? null : existing.portOfArrival,
      incoterms: updates.incoterms !== undefined ? updates.incoterms ?? null : existing.incoterms,
      containerShipment: updates.containerShipment !== undefined ? updates.containerShipment ?? null : existing.containerShipment,
      vesselName: updates.vesselName !== undefined ? updates.vesselName ?? null : existing.vesselName,
      exportClearanceAgent: updates.exportClearanceAgent !== undefined ? updates.exportClearanceAgent : existing.exportClearanceAgent,
      arrivalClearanceAgent: updates.arrivalClearanceAgent !== undefined ? updates.arrivalClearanceAgent : existing.arrivalClearanceAgent,
      supplier: updates.supplier !== undefined ? updates.supplier ?? null : existing.supplier,
      consignee: updates.consignee !== undefined ? updates.consignee ?? null : existing.consignee,
      value: updates.value !== undefined ? updates.value ?? null : existing.value,
      numberOfPieces: updates.numberOfPieces !== undefined ? updates.numberOfPieces ?? null : existing.numberOfPieces,
      packaging: updates.packaging !== undefined ? updates.packaging ?? null : existing.packaging,
      goodsDescription: updates.goodsDescription !== undefined ? updates.goodsDescription ?? null : existing.goodsDescription,
      weight: updates.weight !== undefined ? updates.weight ?? null : existing.weight,
      cube: updates.cube !== undefined ? updates.cube ?? null : existing.cube,
      freightRateOut: updates.freightRateOut !== undefined ? updates.freightRateOut ?? null : existing.freightRateOut,
      clearanceCharge: updates.clearanceCharge !== undefined ? updates.clearanceCharge ?? null : existing.clearanceCharge,
      arrivalClearanceCost: updates.arrivalClearanceCost !== undefined ? updates.arrivalClearanceCost ?? null : existing.arrivalClearanceCost,
      currency: updates.currency !== undefined ? updates.currency ?? null : existing.currency,
      additionalCommodityCodes: updates.additionalCommodityCodes !== undefined ? updates.additionalCommodityCodes ?? null : existing.additionalCommodityCodes,
      haulierName: updates.haulierName !== undefined ? updates.haulierName ?? null : existing.haulierName,
      haulierContactName: updates.haulierContactName !== undefined ? updates.haulierContactName ?? null : existing.haulierContactName,
      attachments: updates.attachments !== undefined ? updates.attachments ?? null : existing.attachments,
      linkedClearanceId: updates.linkedClearanceId !== undefined ? updates.linkedClearanceId ?? null : existing.linkedClearanceId,
    };
    
    this.exportShipments.set(id, updated);
    return updated;
  }

  async deleteExportShipment(id: string): Promise<boolean> {
    return this.exportShipments.delete(id);
  }

  // Custom Clearance methods
  async getAllCustomClearances(): Promise<CustomClearance[]> {
    return Array.from(this.customClearances.values());
  }

  async getCustomClearance(id: string): Promise<CustomClearance | undefined> {
    return this.customClearances.get(id);
  }

  async createCustomClearance(insertClearance: InsertCustomClearance): Promise<CustomClearance> {
    const id = randomUUID();
    const jobRef = this.getNextJobRef();
    
    const clearance: CustomClearance = {
      ...insertClearance,
      id,
      jobRef,
      createdAt: new Date().toISOString(),
      status: insertClearance.status ?? "Awaiting Entry",
      importCustomerId: insertClearance.importCustomerId ?? null,
      exportCustomerId: insertClearance.exportCustomerId ?? null,
      receiverId: insertClearance.receiverId ?? null,
      etaPort: insertClearance.etaPort ?? null,
      portOfArrival: insertClearance.portOfArrival ?? null,
      trailerOrContainerNumber: insertClearance.trailerOrContainerNumber ?? null,
      departureFrom: insertClearance.departureFrom ?? null,
      containerShipment: insertClearance.containerShipment ?? null,
      vesselName: insertClearance.vesselName ?? null,
      numberOfPieces: insertClearance.numberOfPieces ?? null,
      packaging: insertClearance.packaging ?? null,
      weight: insertClearance.weight ?? null,
      cube: insertClearance.cube ?? null,
      goodsDescription: insertClearance.goodsDescription ?? null,
      invoiceValue: insertClearance.invoiceValue ?? null,
      transportCosts: insertClearance.transportCosts ?? null,
      clearanceCharge: insertClearance.clearanceCharge ?? null,
      currency: insertClearance.currency ?? null,
      additionalCommodityCodes: insertClearance.additionalCommodityCodes ?? null,
      vatZeroRated: insertClearance.vatZeroRated ?? false,
      clearanceType: insertClearance.clearanceType ?? null,
      incoterms: insertClearance.incoterms ?? null,
      customerReferenceNumber: insertClearance.customerReferenceNumber ?? null,
      supplierName: insertClearance.supplierName ?? null,
      deliveryAddress: insertClearance.deliveryAddress ?? null,
      additionalNotes: insertClearance.additionalNotes ?? null,
      transportDocuments: insertClearance.transportDocuments ?? null,
      clearanceDocuments: insertClearance.clearanceDocuments ?? null,
      adviseAgentStatusIndicator: insertClearance.adviseAgentStatusIndicator ?? 2,
      sendEntryToCustomerStatusIndicator: insertClearance.sendEntryToCustomerStatusIndicator ?? 2,
      invoiceCustomerStatusIndicator: insertClearance.invoiceCustomerStatusIndicator ?? 2,
      sendClearedEntryStatusIndicator: insertClearance.sendClearedEntryStatusIndicator ?? 2,
      createdFromType: insertClearance.createdFromType ?? null,
      createdFromId: insertClearance.createdFromId ?? null,
    };

    this.customClearances.set(id, clearance);
    return clearance;
  }

  async updateCustomClearance(id: string, updates: Partial<InsertCustomClearance>): Promise<CustomClearance | undefined> {
    const existing = this.customClearances.get(id);
    if (!existing) return undefined;

    const updated: CustomClearance = { 
      ...existing, 
      ...updates,
      status: updates.status !== undefined ? updates.status ?? "Awaiting Entry" : existing.status,
      importCustomerId: updates.importCustomerId !== undefined ? updates.importCustomerId ?? null : existing.importCustomerId,
      exportCustomerId: updates.exportCustomerId !== undefined ? updates.exportCustomerId ?? null : existing.exportCustomerId,
      receiverId: updates.receiverId !== undefined ? updates.receiverId ?? null : existing.receiverId,
      etaPort: updates.etaPort !== undefined ? updates.etaPort ?? null : existing.etaPort,
      portOfArrival: updates.portOfArrival !== undefined ? updates.portOfArrival ?? null : existing.portOfArrival,
      trailerOrContainerNumber: updates.trailerOrContainerNumber !== undefined ? updates.trailerOrContainerNumber ?? null : existing.trailerOrContainerNumber,
      departureFrom: updates.departureFrom !== undefined ? updates.departureFrom ?? null : existing.departureFrom,
      containerShipment: updates.containerShipment !== undefined ? updates.containerShipment ?? null : existing.containerShipment,
      vesselName: updates.vesselName !== undefined ? updates.vesselName ?? null : existing.vesselName,
      numberOfPieces: updates.numberOfPieces !== undefined ? updates.numberOfPieces ?? null : existing.numberOfPieces,
      packaging: updates.packaging !== undefined ? updates.packaging ?? null : existing.packaging,
      weight: updates.weight !== undefined ? updates.weight ?? null : existing.weight,
      cube: updates.cube !== undefined ? updates.cube ?? null : existing.cube,
      goodsDescription: updates.goodsDescription !== undefined ? updates.goodsDescription ?? null : existing.goodsDescription,
      invoiceValue: updates.invoiceValue !== undefined ? updates.invoiceValue ?? null : existing.invoiceValue,
      transportCosts: updates.transportCosts !== undefined ? updates.transportCosts ?? null : existing.transportCosts,
      clearanceCharge: updates.clearanceCharge !== undefined ? updates.clearanceCharge ?? null : existing.clearanceCharge,
      currency: updates.currency !== undefined ? updates.currency ?? null : existing.currency,
      additionalCommodityCodes: updates.additionalCommodityCodes !== undefined ? updates.additionalCommodityCodes ?? null : existing.additionalCommodityCodes,
      vatZeroRated: updates.vatZeroRated !== undefined ? updates.vatZeroRated ?? false : existing.vatZeroRated,
      clearanceType: updates.clearanceType !== undefined ? updates.clearanceType ?? null : existing.clearanceType,
      incoterms: updates.incoterms !== undefined ? updates.incoterms ?? null : existing.incoterms,
      customerReferenceNumber: updates.customerReferenceNumber !== undefined ? updates.customerReferenceNumber ?? null : existing.customerReferenceNumber,
      supplierName: updates.supplierName !== undefined ? updates.supplierName ?? null : existing.supplierName,
      deliveryAddress: updates.deliveryAddress !== undefined ? updates.deliveryAddress ?? null : existing.deliveryAddress,
      additionalNotes: updates.additionalNotes !== undefined ? updates.additionalNotes ?? null : existing.additionalNotes,
      transportDocuments: updates.transportDocuments !== undefined ? updates.transportDocuments ?? null : existing.transportDocuments,
      clearanceDocuments: updates.clearanceDocuments !== undefined ? updates.clearanceDocuments ?? null : existing.clearanceDocuments,
      adviseAgentStatusIndicator: updates.adviseAgentStatusIndicator !== undefined ? updates.adviseAgentStatusIndicator ?? 2 : existing.adviseAgentStatusIndicator,
      sendEntryToCustomerStatusIndicator: updates.sendEntryToCustomerStatusIndicator !== undefined ? updates.sendEntryToCustomerStatusIndicator ?? 2 : existing.sendEntryToCustomerStatusIndicator,
      invoiceCustomerStatusIndicator: updates.invoiceCustomerStatusIndicator !== undefined ? updates.invoiceCustomerStatusIndicator ?? 2 : existing.invoiceCustomerStatusIndicator,
      sendClearedEntryStatusIndicator: updates.sendClearedEntryStatusIndicator !== undefined ? updates.sendClearedEntryStatusIndicator ?? 2 : existing.sendClearedEntryStatusIndicator,
      createdFromType: updates.createdFromType !== undefined ? updates.createdFromType ?? null : existing.createdFromType,
      createdFromId: updates.createdFromId !== undefined ? updates.createdFromId ?? null : existing.createdFromId,
    };
    
    this.customClearances.set(id, updated);
    return updated;
  }

  async deleteCustomClearance(id: string): Promise<boolean> {
    return this.customClearances.delete(id);
  }

  // Job File Group methods (stubs for MemStorage)
  async getJobFileGroupByJobRef(jobRef: number): Promise<JobFileGroup | undefined> {
    return undefined;
  }

  async createJobFileGroup(group: InsertJobFileGroup): Promise<JobFileGroup> {
    throw new Error("Job file groups not supported in memory storage");
  }

  async updateJobFileGroup(jobRef: number, group: Partial<InsertJobFileGroup>): Promise<JobFileGroup | undefined> {
    return undefined;
  }

  async deleteJobFileGroup(jobRef: number): Promise<boolean> {
    return false;
  }

  // Job History methods (stubs for MemStorage)
  async getImportShipmentsByCustomerId(customerId: string): Promise<ImportShipment[]> {
    return Array.from(this.importShipments.values()).filter(s => s.importCustomerId === customerId);
  }

  async getExportShipmentsByCustomerId(customerId: string): Promise<ExportShipment[]> {
    return Array.from(this.exportShipments.values()).filter(s => s.destinationCustomerId === customerId);
  }
}

// Database Storage Implementation using Drizzle ORM
export class DatabaseStorage implements IStorage {
  private jobRefCounter: number = 26001;
  private initialized: boolean = false;
  public sessionStore: session.Store;

  constructor() {
    // Use PostgreSQL store for sessions (persists across restarts)
    const PgStore = connectPg(session);
    this.sessionStore = new PgStore({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: true,
    });
  }

  private async initialize() {
    if (this.initialized) return;
    
    // Get the maximum job ref from all tables
    const [maxImport] = await db.select({ max: sql<number>`MAX(${importShipments.jobRef})` }).from(importShipments);
    const [maxExport] = await db.select({ max: sql<number>`MAX(${exportShipments.jobRef})` }).from(exportShipments);
    const [maxClearance] = await db.select({ max: sql<number>`MAX(${customClearances.jobRef})` }).from(customClearances);
    
    const currentMax = Math.max(
      maxImport.max || 26000,
      maxExport.max || 26000,
      maxClearance.max || 26000
    );
    
    this.jobRefCounter = currentMax + 1;
    this.initialized = true;
  }

  getNextJobRef(): number {
    return this.jobRefCounter++;
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
    return result.count;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, user: Partial<UpdateUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateUserActivity(userId: string): Promise<void> {
    const now = new Date().toISOString();
    await db.update(users)
      .set({ lastActivity: now })
      .where(eq(users.id, userId));
  }

  async getOnlineUsers(): Promise<string[]> {
    // Users are considered online if their last activity was within 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const onlineUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`${users.lastActivity} > ${twoMinutesAgo}`);
    
    return onlineUsers.map(u => u.id);
  }

  // Message methods
  async getAllMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async getMessagesByUser(userId: string): Promise<Message[]> {
    return await db.select().from(messages)
      .where(sql`${messages.senderId} = ${userId} OR ${messages.recipientId} = ${userId}`)
      .orderBy(desc(messages.createdAt));
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  async markMessageAsRead(id: string): Promise<Message | undefined> {
    const [updated] = await db.update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, id))
      .returning();
    return updated;
  }

  async deleteMessage(id: string): Promise<boolean> {
    const result = await db.delete(messages).where(eq(messages.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(messages)
      .where(sql`${messages.recipientId} = ${userId} AND ${messages.isRead} = false`);
    return result.count;
  }

  // Import Customer methods
  async getAllImportCustomers(): Promise<ImportCustomer[]> {
    return await db.select().from(importCustomers);
  }

  async getImportCustomer(id: string): Promise<ImportCustomer | undefined> {
    const [customer] = await db.select().from(importCustomers).where(eq(importCustomers.id, id));
    return customer;
  }

  async searchImportCustomers(query: string, limit: number = 25): Promise<ImportCustomer[]> {
    if (!query || query.trim() === '') {
      // Return top N alphabetically when no query
      return await db.select().from(importCustomers)
        .orderBy(importCustomers.companyName)
        .limit(limit);
    }
    
    const searchPattern = `%${query}%`;
    return await db.select().from(importCustomers)
      .where(
        or(
          ilike(importCustomers.companyName, searchPattern),
          sql`EXISTS (SELECT 1 FROM unnest(coalesce(${importCustomers.contactName}, ARRAY[]::text[])) AS name WHERE name ILIKE ${searchPattern})`
        )
      )
      .orderBy(importCustomers.companyName)
      .limit(limit);
  }

  async createImportCustomer(customer: InsertImportCustomer): Promise<ImportCustomer> {
    const [created] = await db.insert(importCustomers).values(customer).returning();
    return created;
  }

  async updateImportCustomer(id: string, customer: Partial<InsertImportCustomer>): Promise<ImportCustomer | undefined> {
    const [updated] = await db.update(importCustomers).set(customer).where(eq(importCustomers.id, id)).returning();
    return updated;
  }

  async deleteImportCustomer(id: string): Promise<boolean> {
    const result = await db.delete(importCustomers).where(eq(importCustomers.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Export Customer methods
  async getAllExportCustomers(): Promise<ExportCustomer[]> {
    return await db.select().from(exportCustomers);
  }

  async getExportCustomer(id: string): Promise<ExportCustomer | undefined> {
    const [customer] = await db.select().from(exportCustomers).where(eq(exportCustomers.id, id));
    return customer;
  }

  async searchExportCustomers(query: string, limit: number = 25): Promise<ExportCustomer[]> {
    if (!query || query.trim() === '') {
      // Return top N alphabetically when no query
      return await db.select().from(exportCustomers)
        .orderBy(exportCustomers.companyName)
        .limit(limit);
    }
    
    const searchPattern = `%${query}%`;
    return await db.select().from(exportCustomers)
      .where(
        or(
          ilike(exportCustomers.companyName, searchPattern),
          sql`EXISTS (SELECT 1 FROM unnest(coalesce(${exportCustomers.contactName}, ARRAY[]::text[])) AS name WHERE name ILIKE ${searchPattern})`
        )
      )
      .orderBy(exportCustomers.companyName)
      .limit(limit);
  }

  async createExportCustomer(customer: InsertExportCustomer): Promise<ExportCustomer> {
    const [created] = await db.insert(exportCustomers).values(customer).returning();
    return created;
  }

  async updateExportCustomer(id: string, customer: Partial<InsertExportCustomer>): Promise<ExportCustomer | undefined> {
    const [updated] = await db.update(exportCustomers).set(customer).where(eq(exportCustomers.id, id)).returning();
    return updated;
  }

  async deleteExportCustomer(id: string): Promise<boolean> {
    const result = await db.delete(exportCustomers).where(eq(exportCustomers.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Export Receiver methods
  async getAllExportReceivers(): Promise<ExportReceiver[]> {
    return await db.select().from(exportReceivers);
  }

  async getExportReceiver(id: string): Promise<ExportReceiver | undefined> {
    const [receiver] = await db.select().from(exportReceivers).where(eq(exportReceivers.id, id));
    return receiver;
  }

  async searchExportReceivers(query: string, limit: number = 25): Promise<ExportReceiver[]> {
    if (!query || query.trim() === '') {
      // Return top N alphabetically when no query
      return await db.select().from(exportReceivers)
        .orderBy(exportReceivers.companyName)
        .limit(limit);
    }
    
    const searchPattern = `%${query}%`;
    return await db.select().from(exportReceivers)
      .where(ilike(exportReceivers.companyName, searchPattern))
      .orderBy(exportReceivers.companyName)
      .limit(limit);
  }

  async createExportReceiver(receiver: InsertExportReceiver): Promise<ExportReceiver> {
    const [created] = await db.insert(exportReceivers).values(receiver).returning();
    return created;
  }

  async updateExportReceiver(id: string, receiver: Partial<InsertExportReceiver>): Promise<ExportReceiver | undefined> {
    const [updated] = await db.update(exportReceivers).set(receiver).where(eq(exportReceivers.id, id)).returning();
    return updated;
  }

  async deleteExportReceiver(id: string): Promise<boolean> {
    const result = await db.delete(exportReceivers).where(eq(exportReceivers.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Haulier methods
  async getAllHauliers(): Promise<Haulier[]> {
    return await db.select().from(hauliers);
  }

  async getHaulier(id: string): Promise<Haulier | undefined> {
    const [haulier] = await db.select().from(hauliers).where(eq(hauliers.id, id));
    return haulier;
  }

  async createHaulier(haulier: InsertHaulier): Promise<Haulier> {
    const [created] = await db.insert(hauliers).values(haulier).returning();
    return created;
  }

  async updateHaulier(id: string, haulier: Partial<InsertHaulier>): Promise<Haulier | undefined> {
    const [updated] = await db.update(hauliers).set(haulier).where(eq(hauliers.id, id)).returning();
    return updated;
  }

  async deleteHaulier(id: string): Promise<boolean> {
    const result = await db.delete(hauliers).where(eq(hauliers.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Shipping Line methods
  async getAllShippingLines(): Promise<ShippingLine[]> {
    return await db.select().from(shippingLines);
  }

  async getShippingLine(id: string): Promise<ShippingLine | undefined> {
    const [shippingLine] = await db.select().from(shippingLines).where(eq(shippingLines.id, id));
    return shippingLine;
  }

  async createShippingLine(shippingLine: InsertShippingLine): Promise<ShippingLine> {
    const [created] = await db.insert(shippingLines).values(shippingLine).returning();
    return created;
  }

  async updateShippingLine(id: string, shippingLine: Partial<InsertShippingLine>): Promise<ShippingLine | undefined> {
    const [updated] = await db.update(shippingLines).set(shippingLine).where(eq(shippingLines.id, id)).returning();
    return updated;
  }

  async deleteShippingLine(id: string): Promise<boolean> {
    const result = await db.delete(shippingLines).where(eq(shippingLines.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Clearance Agent methods
  async getAllClearanceAgents(): Promise<ClearanceAgent[]> {
    return await db.select().from(clearanceAgents);
  }

  async getClearanceAgent(id: string): Promise<ClearanceAgent | undefined> {
    const [agent] = await db.select().from(clearanceAgents).where(eq(clearanceAgents.id, id));
    return agent;
  }

  async createClearanceAgent(agent: InsertClearanceAgent): Promise<ClearanceAgent> {
    const [created] = await db.insert(clearanceAgents).values(agent).returning();
    return created;
  }

  async updateClearanceAgent(id: string, agent: Partial<InsertClearanceAgent>): Promise<ClearanceAgent | undefined> {
    const [updated] = await db.update(clearanceAgents).set(agent).where(eq(clearanceAgents.id, id)).returning();
    return updated;
  }

  async deleteClearanceAgent(id: string): Promise<boolean> {
    const result = await db.delete(clearanceAgents).where(eq(clearanceAgents.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Settings methods
  async getSettings(): Promise<Settings | undefined> {
    const [settingsRecord] = await db.select().from(settings).limit(1);
    return settingsRecord;
  }

  async updateSettings(id: string, settingsData: Partial<InsertSettings>): Promise<Settings | undefined> {
    const [updated] = await db.update(settings).set(settingsData).where(eq(settings.id, id)).returning();
    return updated;
  }

  async createSettings(settingsData: InsertSettings): Promise<Settings> {
    const [created] = await db.insert(settings).values(settingsData).returning();
    return created;
  }

  // Import Shipment methods
  async getAllImportShipments(): Promise<ImportShipment[]> {
    return await db.select().from(importShipments).orderBy(desc(importShipments.createdAt));
  }

  async getImportShipment(id: string): Promise<ImportShipment | undefined> {
    const [shipment] = await db.select().from(importShipments).where(eq(importShipments.id, id));
    return shipment;
  }

  async createImportShipment(insertShipment: InsertImportShipment): Promise<ImportShipment> {
    await this.initialize();
    const jobRef = this.getNextJobRef();
    
    const [shipment] = await db.insert(importShipments).values({
      ...insertShipment,
      jobRef: jobRef,
      createdAt: new Date().toISOString(),
    }).returning();

    // Auto-create Custom Clearance if rsToClear is true
    if (shipment.rsToClear) {
      const [clearance] = await db.insert(customClearances).values({
        jobRef: shipment.jobRef,
        jobType: "import",
        createdAt: new Date().toISOString(),
        status: "Awaiting Entry",
        importCustomerId: shipment.importCustomerId,
        exportCustomerId: null,
        receiverId: null,
        etaPort: shipment.importDateEtaPort,
        portOfArrival: shipment.portOfArrival,
        trailerOrContainerNumber: shipment.trailerOrContainerNumber,
        departureFrom: shipment.departureCountry,
        containerShipment: shipment.containerShipment,
        vesselName: shipment.vesselName,
        numberOfPieces: shipment.numberOfPieces,
        packaging: shipment.packaging,
        weight: shipment.weight,
        cube: shipment.cube,
        goodsDescription: shipment.goodsDescription,
        invoiceValue: shipment.invoiceValue,
        transportCosts: shipment.freightCharge,
        clearanceCharge: shipment.clearanceCharge,
        currency: shipment.currency,
        additionalCommodityCodes: shipment.additionalCommodityCodes,
        vatZeroRated: shipment.vatZeroRated,
        clearanceType: shipment.clearanceType,
        incoterms: null,
        customerReferenceNumber: shipment.customerReferenceNumber,
        supplierName: shipment.supplierName,
        attachments: null,
        createdFromType: "import",
        createdFromId: shipment.id,
      }).returning();

      // Update shipment with linked clearance ID
      const [updated] = await db.update(importShipments)
        .set({ linkedClearanceId: clearance.id })
        .where(eq(importShipments.id, shipment.id))
        .returning();
      
      return updated;
    }

    return shipment;
  }

  async updateImportShipment(id: string, updates: Partial<InsertImportShipment>): Promise<ImportShipment | undefined> {
    const existing = await this.getImportShipment(id);
    if (!existing) return undefined;

    // If rsToClear is being changed from true to false, delete the linked clearance
    if (existing.rsToClear && updates.rsToClear === false && existing.linkedClearanceId) {
      await db.delete(customClearances).where(eq(customClearances.id, existing.linkedClearanceId));
      updates.linkedClearanceId = null;
    }

    // If rsToClear is true and there's no linked clearance, create one
    const finalRsToClear = updates.rsToClear !== undefined ? updates.rsToClear : existing.rsToClear;
    if (finalRsToClear === true && !existing.linkedClearanceId) {
      const updatedShipment = { ...existing, ...updates };
      
      const [clearance] = await db.insert(customClearances).values({
        jobRef: existing.jobRef,
        jobType: "import",
        createdAt: new Date().toISOString(),
        status: "Awaiting Entry",
        importCustomerId: updatedShipment.importCustomerId,
        exportCustomerId: null,
        receiverId: null,
        etaPort: updatedShipment.importDateEtaPort,
        portOfArrival: updatedShipment.portOfArrival,
        trailerOrContainerNumber: updatedShipment.trailerOrContainerNumber,
        departureFrom: updatedShipment.departureCountry,
        containerShipment: updatedShipment.containerShipment,
        vesselName: updatedShipment.vesselName,
        numberOfPieces: updatedShipment.numberOfPieces,
        packaging: updatedShipment.packaging,
        weight: updatedShipment.weight,
        cube: updatedShipment.cube,
        goodsDescription: updatedShipment.goodsDescription,
        invoiceValue: updatedShipment.invoiceValue,
        transportCosts: updatedShipment.freightCharge,
        clearanceCharge: updatedShipment.clearanceCharge,
        currency: updatedShipment.currency,
        additionalCommodityCodes: updatedShipment.additionalCommodityCodes,
        vatZeroRated: updatedShipment.vatZeroRated,
        clearanceType: updatedShipment.clearanceType,
        incoterms: null,
        customerReferenceNumber: updatedShipment.customerReferenceNumber,
        supplierName: updatedShipment.supplierName,
        attachments: null,
        createdFromType: "import",
        createdFromId: existing.id,
      }).returning();

      updates.linkedClearanceId = clearance.id;
    }

    const [updated] = await db.update(importShipments)
      .set(updates)
      .where(eq(importShipments.id, id))
      .returning();
    
    // Sync files to job_file_groups if jobRef exists and attachments were updated
    if (updated.jobRef && updates.attachments !== undefined) {
      const newDocuments = updated.attachments || [];
      
      // Get existing job file group
      const [existingGroup] = await db.select()
        .from(jobFileGroups)
        .where(eq(jobFileGroups.jobRef, updated.jobRef));
      
      if (existingGroup) {
        // Update documents with the new attachments
        await db.update(jobFileGroups)
          .set({ documents: newDocuments })
          .where(eq(jobFileGroups.jobRef, updated.jobRef));
      } else {
        // Create new job file group with the attachments
        await db.insert(jobFileGroups).values({
          jobRef: updated.jobRef,
          documents: newDocuments,
          rsInvoices: [],
        });
      }
      
      // Also sync back to linked custom clearance if it exists
      if (updated.linkedClearanceId) {
        await db.update(customClearances)
          .set({ transportDocuments: newDocuments })
          .where(eq(customClearances.id, updated.linkedClearanceId));
      }
    }
    
    return updated;
  }

  async deleteImportShipment(id: string): Promise<boolean> {
    const existing = await this.getImportShipment(id);
    
    // If there's a linked clearance, delete it first
    if (existing?.linkedClearanceId) {
      await db.delete(customClearances).where(eq(customClearances.id, existing.linkedClearanceId));
    }
    
    const result = await db.delete(importShipments).where(eq(importShipments.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Export Shipment methods
  async getAllExportShipments(): Promise<ExportShipment[]> {
    return await db.select().from(exportShipments).orderBy(desc(exportShipments.createdAt));
  }

  async getExportShipment(id: string): Promise<ExportShipment | undefined> {
    const [shipment] = await db.select().from(exportShipments).where(eq(exportShipments.id, id));
    return shipment;
  }

  async createExportShipment(insertShipment: InsertExportShipment): Promise<ExportShipment> {
    await this.initialize();
    const jobRef = this.getNextJobRef();
    
    const [shipment] = await db.insert(exportShipments).values({
      ...insertShipment,
      jobRef: jobRef,
      createdAt: new Date().toISOString(),
    }).returning();

    // Auto-create Custom Clearance if exportClearanceAgent is "R.S"
    if (shipment.exportClearanceAgent === "R.S") {
      const [clearance] = await db.insert(customClearances).values({
        jobRef: shipment.jobRef,
        jobType: "export",
        createdAt: new Date().toISOString(),
        status: "Awaiting Entry",
        importCustomerId: null,
        exportCustomerId: shipment.destinationCustomerId,
        receiverId: shipment.receiverId,
        etaPort: shipment.bookingDate,
        portOfArrival: shipment.portOfArrival,
        trailerOrContainerNumber: shipment.trailerNo,
        departureFrom: shipment.departureFrom,
        containerShipment: shipment.containerShipment,
        vesselName: shipment.vesselName,
        numberOfPieces: shipment.numberOfPieces,
        packaging: shipment.packaging,
        weight: shipment.weight,
        cube: shipment.cube,
        goodsDescription: shipment.goodsDescription,
        invoiceValue: shipment.value,
        transportCosts: shipment.freightRateOut,
        clearanceCharge: shipment.clearanceCharge,
        currency: shipment.currency,
        additionalCommodityCodes: shipment.additionalCommodityCodes,
        vatZeroRated: false,
        clearanceType: null,
        incoterms: shipment.incoterms,
        customerReferenceNumber: shipment.customerReferenceNumber,
        supplierName: shipment.supplier,
        attachments: null,
        createdFromType: "export",
        createdFromId: shipment.id,
      }).returning();

      // Update shipment with linked clearance ID
      const [updated] = await db.update(exportShipments)
        .set({ linkedClearanceId: clearance.id })
        .where(eq(exportShipments.id, shipment.id))
        .returning();
      
      return updated;
    }

    return shipment;
  }

  async updateExportShipment(id: string, updates: Partial<InsertExportShipment>): Promise<ExportShipment | undefined> {
    const existing = await this.getExportShipment(id);
    if (!existing) return undefined;

    // If exportClearanceAgent is being changed from "R.S" to something else, delete the linked clearance
    if (existing.exportClearanceAgent === "R.S" && updates.exportClearanceAgent && updates.exportClearanceAgent !== "R.S" && existing.linkedClearanceId) {
      await db.delete(customClearances).where(eq(customClearances.id, existing.linkedClearanceId));
      updates.linkedClearanceId = null;
    }

    const [updated] = await db.update(exportShipments)
      .set(updates)
      .where(eq(exportShipments.id, id))
      .returning();
    
    return updated;
  }

  async deleteExportShipment(id: string): Promise<boolean> {
    const existing = await this.getExportShipment(id);
    
    // If there's a linked clearance, delete it first
    if (existing?.linkedClearanceId) {
      await db.delete(customClearances).where(eq(customClearances.id, existing.linkedClearanceId));
    }
    
    const result = await db.delete(exportShipments).where(eq(exportShipments.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Custom Clearance methods
  async getAllCustomClearances(): Promise<CustomClearance[]> {
    return await db.select().from(customClearances).orderBy(desc(customClearances.createdAt));
  }

  async getCustomClearance(id: string): Promise<CustomClearance | undefined> {
    const [clearance] = await db.select().from(customClearances).where(eq(customClearances.id, id));
    return clearance;
  }

  async createCustomClearance(insertClearance: InsertCustomClearance): Promise<CustomClearance> {
    await this.initialize();
    const jobRef = this.getNextJobRef();
    
    const [clearance] = await db.insert(customClearances).values({
      ...insertClearance,
      jobRef: jobRef,
      createdAt: new Date().toISOString(),
    }).returning();

    return clearance;
  }

  async updateCustomClearance(id: string, updates: Partial<InsertCustomClearance>): Promise<CustomClearance | undefined> {
    const [updated] = await db.update(customClearances)
      .set(updates)
      .where(eq(customClearances.id, id))
      .returning();
    
    // Sync files to job_file_groups if jobRef exists and transportDocuments were updated
    if (updated.jobRef && updates.transportDocuments !== undefined) {
      const newDocuments = updated.transportDocuments || [];
      
      // Get existing job file group
      const [existingGroup] = await db.select()
        .from(jobFileGroups)
        .where(eq(jobFileGroups.jobRef, updated.jobRef));
      
      if (existingGroup) {
        // Update documents with the new transportDocuments
        await db.update(jobFileGroups)
          .set({ documents: newDocuments })
          .where(eq(jobFileGroups.jobRef, updated.jobRef));
      } else {
        // Create new job file group with the transportDocuments
        await db.insert(jobFileGroups).values({
          jobRef: updated.jobRef,
          documents: newDocuments,
          rsInvoices: [],
        });
      }
      
      // Also sync back to linked import shipment if it exists
      if (updated.createdFromType === 'import' && updated.createdFromId) {
        await db.update(importShipments)
          .set({ attachments: newDocuments })
          .where(eq(importShipments.id, updated.createdFromId));
      }
      
      // Also sync back to linked export shipment if it exists
      if (updated.createdFromType === 'export' && updated.createdFromId) {
        await db.update(exportShipments)
          .set({ attachments: newDocuments })
          .where(eq(exportShipments.id, updated.createdFromId));
      }
    }
    
    return updated;
  }

  async deleteCustomClearance(id: string): Promise<boolean> {
    const result = await db.delete(customClearances).where(eq(customClearances.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Job File Group methods
  async getJobFileGroupByJobRef(jobRef: number): Promise<JobFileGroup | undefined> {
    const [group] = await db.select().from(jobFileGroups).where(eq(jobFileGroups.jobRef, jobRef));
    return group;
  }

  async createJobFileGroup(insertGroup: InsertJobFileGroup): Promise<JobFileGroup> {
    const [group] = await db.insert(jobFileGroups).values({
      ...insertGroup,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();
    
    return group;
  }

  async updateJobFileGroup(jobRef: number, updates: Partial<InsertJobFileGroup>): Promise<JobFileGroup | undefined> {
    const [updated] = await db.update(jobFileGroups)
      .set({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(jobFileGroups.jobRef, jobRef))
      .returning();
    
    return updated;
  }

  async deleteJobFileGroup(jobRef: number): Promise<boolean> {
    const result = await db.delete(jobFileGroups).where(eq(jobFileGroups.jobRef, jobRef));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Job History methods
  async getImportShipmentsByCustomerId(customerId: string): Promise<ImportShipment[]> {
    const shipments = await db.select()
      .from(importShipments)
      .where(eq(importShipments.importCustomerId, customerId))
      .orderBy(desc(importShipments.jobRef));
    return shipments;
  }

  async getExportShipmentsByCustomerId(customerId: string): Promise<ExportShipment[]> {
    const shipments = await db.select()
      .from(exportShipments)
      .where(eq(exportShipments.destinationCustomerId, customerId))
      .orderBy(desc(exportShipments.jobRef));
    return shipments;
  }

  // Purchase Invoice methods
  async getAllPurchaseInvoices(): Promise<PurchaseInvoice[]> {
    const invoices = await db.select()
      .from(purchaseInvoices)
      .orderBy(desc(purchaseInvoices.createdAt));
    return invoices;
  }

  async getPurchaseInvoicesByJobRef(jobRef: number): Promise<PurchaseInvoice[]> {
    const invoices = await db.select()
      .from(purchaseInvoices)
      .where(eq(purchaseInvoices.jobRef, jobRef))
      .orderBy(desc(purchaseInvoices.createdAt));
    return invoices;
  }

  async getPurchaseInvoice(id: string): Promise<PurchaseInvoice | undefined> {
    const [invoice] = await db.select()
      .from(purchaseInvoices)
      .where(eq(purchaseInvoices.id, id));
    return invoice;
  }

  async createPurchaseInvoice(insertInvoice: InsertPurchaseInvoice): Promise<PurchaseInvoice> {
    const [invoice] = await db.insert(purchaseInvoices)
      .values({
        ...insertInvoice,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return invoice;
  }

  async createManyPurchaseInvoices(insertInvoices: InsertPurchaseInvoice[]): Promise<PurchaseInvoice[]> {
    const invoices = await db.insert(purchaseInvoices)
      .values(insertInvoices.map(inv => ({
        ...inv,
        createdAt: new Date().toISOString(),
      })))
      .returning();
    return invoices;
  }

  async updatePurchaseInvoice(id: string, updates: Partial<InsertPurchaseInvoice>): Promise<PurchaseInvoice | undefined> {
    const [updated] = await db.update(purchaseInvoices)
      .set(updates)
      .where(eq(purchaseInvoices.id, id))
      .returning();
    return updated;
  }

  async deletePurchaseInvoice(id: string): Promise<boolean> {
    const result = await db.delete(purchaseInvoices)
      .where(eq(purchaseInvoices.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();