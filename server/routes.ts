import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertImportCustomerSchema,
  insertExportCustomerSchema,
  insertExportReceiverSchema,
  insertHaulierSchema,
  insertShippingLineSchema,
  insertClearanceAgentSchema,
  insertSettingsSchema,
  insertImportShipmentSchema,
  insertExportShipmentSchema,
  insertCustomClearanceSchema
} from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

export async function registerRoutes(app: Express): Promise<Server> {
  // ========== Import Customers Routes ==========
  
  // Get all import customers
  app.get("/api/import-customers", async (_req, res) => {
    try {
      const customers = await storage.getAllImportCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch import customers" });
    }
  });

  // Get single import customer
  app.get("/api/import-customers/:id", async (req, res) => {
    try {
      const customer = await storage.getImportCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Import customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch import customer" });
    }
  });

  // Create import customer
  app.post("/api/import-customers", async (req, res) => {
    try {
      const validatedData = insertImportCustomerSchema.parse(req.body);
      const customer = await storage.createImportCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ error: "Invalid import customer data" });
    }
  });

  // Update import customer
  app.patch("/api/import-customers/:id", async (req, res) => {
    try {
      const validatedData = insertImportCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateImportCustomer(req.params.id, validatedData);
      if (!customer) {
        return res.status(404).json({ error: "Import customer not found" });
      }
      res.json(customer);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid import customer data" });
      }
      res.status(500).json({ error: "Failed to update import customer" });
    }
  });

  // Delete import customer
  app.delete("/api/import-customers/:id", async (req, res) => {
    try {
      const success = await storage.deleteImportCustomer(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Import customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete import customer" });
    }
  });

  // ========== Export Customers Routes ==========
  
  // Get all export customers
  app.get("/api/export-customers", async (_req, res) => {
    try {
      const customers = await storage.getAllExportCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch export customers" });
    }
  });

  // Get single export customer
  app.get("/api/export-customers/:id", async (req, res) => {
    try {
      const customer = await storage.getExportCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Export customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch export customer" });
    }
  });

  // Create export customer
  app.post("/api/export-customers", async (req, res) => {
    try {
      const validatedData = insertExportCustomerSchema.parse(req.body);
      const customer = await storage.createExportCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ error: "Invalid export customer data" });
    }
  });

  // Update export customer
  app.patch("/api/export-customers/:id", async (req, res) => {
    try {
      const validatedData = insertExportCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateExportCustomer(req.params.id, validatedData);
      if (!customer) {
        return res.status(404).json({ error: "Export customer not found" });
      }
      res.json(customer);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid export customer data" });
      }
      res.status(500).json({ error: "Failed to update export customer" });
    }
  });

  // Delete export customer
  app.delete("/api/export-customers/:id", async (req, res) => {
    try {
      const success = await storage.deleteExportCustomer(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Export customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete export customer" });
    }
  });

  // ========== Export Receivers Routes ==========
  
  // Get all export receivers
  app.get("/api/export-receivers", async (_req, res) => {
    try {
      const receivers = await storage.getAllExportReceivers();
      res.json(receivers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch export receivers" });
    }
  });

  // Get single export receiver
  app.get("/api/export-receivers/:id", async (req, res) => {
    try {
      const receiver = await storage.getExportReceiver(req.params.id);
      if (!receiver) {
        return res.status(404).json({ error: "Export receiver not found" });
      }
      res.json(receiver);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch export receiver" });
    }
  });

  // Create export receiver
  app.post("/api/export-receivers", async (req, res) => {
    try {
      const validatedData = insertExportReceiverSchema.parse(req.body);
      const receiver = await storage.createExportReceiver(validatedData);
      res.status(201).json(receiver);
    } catch (error) {
      res.status(400).json({ error: "Invalid export receiver data" });
    }
  });

  // Update export receiver
  app.patch("/api/export-receivers/:id", async (req, res) => {
    try {
      const validatedData = insertExportReceiverSchema.partial().parse(req.body);
      const receiver = await storage.updateExportReceiver(req.params.id, validatedData);
      if (!receiver) {
        return res.status(404).json({ error: "Export receiver not found" });
      }
      res.json(receiver);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid export receiver data" });
      }
      res.status(500).json({ error: "Failed to update export receiver" });
    }
  });

  // Delete export receiver
  app.delete("/api/export-receivers/:id", async (req, res) => {
    try {
      const success = await storage.deleteExportReceiver(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Export receiver not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete export receiver" });
    }
  });

  // ========== Hauliers Routes ==========
  
  // Get all hauliers
  app.get("/api/hauliers", async (_req, res) => {
    try {
      const hauliers = await storage.getAllHauliers();
      res.json(hauliers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hauliers" });
    }
  });

  // Get single haulier
  app.get("/api/hauliers/:id", async (req, res) => {
    try {
      const haulier = await storage.getHaulier(req.params.id);
      if (!haulier) {
        return res.status(404).json({ error: "Haulier not found" });
      }
      res.json(haulier);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch haulier" });
    }
  });

  // Create haulier
  app.post("/api/hauliers", async (req, res) => {
    try {
      const validatedData = insertHaulierSchema.parse(req.body);
      const haulier = await storage.createHaulier(validatedData);
      res.status(201).json(haulier);
    } catch (error) {
      res.status(400).json({ error: "Invalid haulier data" });
    }
  });

  // Update haulier
  app.patch("/api/hauliers/:id", async (req, res) => {
    try {
      const validatedData = insertHaulierSchema.partial().parse(req.body);
      const haulier = await storage.updateHaulier(req.params.id, validatedData);
      if (!haulier) {
        return res.status(404).json({ error: "Haulier not found" });
      }
      res.json(haulier);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid haulier data" });
      }
      res.status(500).json({ error: "Failed to update haulier" });
    }
  });

  // Delete haulier
  app.delete("/api/hauliers/:id", async (req, res) => {
    try {
      const success = await storage.deleteHaulier(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Haulier not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete haulier" });
    }
  });

  // ========== Shipping Lines Routes ==========
  
  // Get all shipping lines
  app.get("/api/shipping-lines", async (_req, res) => {
    try {
      const shippingLines = await storage.getAllShippingLines();
      res.json(shippingLines);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shipping lines" });
    }
  });

  // Get single shipping line
  app.get("/api/shipping-lines/:id", async (req, res) => {
    try {
      const shippingLine = await storage.getShippingLine(req.params.id);
      if (!shippingLine) {
        return res.status(404).json({ error: "Shipping line not found" });
      }
      res.json(shippingLine);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shipping line" });
    }
  });

  // Create shipping line
  app.post("/api/shipping-lines", async (req, res) => {
    try {
      const validatedData = insertShippingLineSchema.parse(req.body);
      const shippingLine = await storage.createShippingLine(validatedData);
      res.status(201).json(shippingLine);
    } catch (error) {
      res.status(400).json({ error: "Invalid shipping line data" });
    }
  });

  // Update shipping line
  app.patch("/api/shipping-lines/:id", async (req, res) => {
    try {
      const validatedData = insertShippingLineSchema.partial().parse(req.body);
      const shippingLine = await storage.updateShippingLine(req.params.id, validatedData);
      if (!shippingLine) {
        return res.status(404).json({ error: "Shipping line not found" });
      }
      res.json(shippingLine);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid shipping line data" });
      }
      res.status(500).json({ error: "Failed to update shipping line" });
    }
  });

  // Delete shipping line
  app.delete("/api/shipping-lines/:id", async (req, res) => {
    try {
      const success = await storage.deleteShippingLine(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Shipping line not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete shipping line" });
    }
  });

  // ========== Clearance Agents Routes ==========
  
  // Get all clearance agents
  app.get("/api/clearance-agents", async (_req, res) => {
    try {
      const agents = await storage.getAllClearanceAgents();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clearance agents" });
    }
  });

  // Get single clearance agent
  app.get("/api/clearance-agents/:id", async (req, res) => {
    try {
      const agent = await storage.getClearanceAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: "Clearance agent not found" });
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clearance agent" });
    }
  });

  // Create clearance agent
  app.post("/api/clearance-agents", async (req, res) => {
    try {
      const validatedData = insertClearanceAgentSchema.parse(req.body);
      const agent = await storage.createClearanceAgent(validatedData);
      res.status(201).json(agent);
    } catch (error) {
      res.status(400).json({ error: "Invalid clearance agent data" });
    }
  });

  // Update clearance agent
  app.patch("/api/clearance-agents/:id", async (req, res) => {
    try {
      const validatedData = insertClearanceAgentSchema.partial().parse(req.body);
      const agent = await storage.updateClearanceAgent(req.params.id, validatedData);
      if (!agent) {
        return res.status(404).json({ error: "Clearance agent not found" });
      }
      res.json(agent);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid clearance agent data" });
      }
      res.status(500).json({ error: "Failed to update clearance agent" });
    }
  });

  // Delete clearance agent
  app.delete("/api/clearance-agents/:id", async (req, res) => {
    try {
      const success = await storage.deleteClearanceAgent(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Clearance agent not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete clearance agent" });
    }
  });

  // ========== Settings Routes ==========
  
  // Get settings (single record)
  app.get("/api/settings", async (_req, res) => {
    try {
      const settingsRecord = await storage.getSettings();
      if (!settingsRecord) {
        return res.status(404).json({ error: "Settings not found" });
      }
      res.json(settingsRecord);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Create settings
  app.post("/api/settings", async (req, res) => {
    try {
      const validatedData = insertSettingsSchema.parse(req.body);
      const settingsRecord = await storage.createSettings(validatedData);
      res.status(201).json(settingsRecord);
    } catch (error) {
      res.status(400).json({ error: "Invalid settings data" });
    }
  });

  // Update settings
  app.patch("/api/settings/:id", async (req, res) => {
    try {
      const validatedData = insertSettingsSchema.partial().parse(req.body);
      const settingsRecord = await storage.updateSettings(req.params.id, validatedData);
      if (!settingsRecord) {
        return res.status(404).json({ error: "Settings not found" });
      }
      res.json(settingsRecord);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid settings data" });
      }
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // ========== Import Shipments Routes ==========
  
  // Get all import shipments
  app.get("/api/import-shipments", async (_req, res) => {
    try {
      const shipments = await storage.getAllImportShipments();
      res.json(shipments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch import shipments" });
    }
  });

  // Get single import shipment
  app.get("/api/import-shipments/:id", async (req, res) => {
    try {
      const shipment = await storage.getImportShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ error: "Import shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch import shipment" });
    }
  });

  // Create import shipment
  app.post("/api/import-shipments", async (req, res) => {
    try {
      const validatedData = insertImportShipmentSchema.parse(req.body);
      const shipment = await storage.createImportShipment(validatedData);
      res.status(201).json(shipment);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          error: "Invalid import shipment data",
          details: error.errors 
        });
      }
      res.status(400).json({ error: "Invalid import shipment data" });
    }
  });

  // Update import shipment
  app.patch("/api/import-shipments/:id", async (req, res) => {
    try {
      // For updates, we make the validation less strict by not requiring all fields
      console.log('[DEBUG] Update import shipment:', req.params.id, 'rsToClear:', req.body.rsToClear);
      const shipment = await storage.updateImportShipment(req.params.id, req.body);
      if (!shipment) {
        return res.status(404).json({ error: "Import shipment not found" });
      }
      console.log('[DEBUG] Updated shipment rsToClear:', shipment.rsToClear, 'linkedClearanceId:', shipment.linkedClearanceId);
      res.json(shipment);
    } catch (error: any) {
      console.error('[ERROR] Failed to update import shipment:', error);
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          error: "Invalid import shipment data",
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to update import shipment" });
    }
  });

  // Update clearance status indicator
  app.patch("/api/import-shipments/:id/clearance-status", async (req, res) => {
    try {
      const { status } = req.body;
      if (![1, 2, 3, 4].includes(status)) {
        return res.status(400).json({ error: "Status must be 1, 2, 3, or 4" });
      }
      const shipment = await storage.updateImportShipment(req.params.id, { 
        clearanceStatusIndicator: status 
      });
      if (!shipment) {
        return res.status(404).json({ error: "Import shipment not found" });
      }
      
      // Sync to linked custom clearance if it exists
      if (shipment.linkedClearanceId) {
        await storage.updateCustomClearance(shipment.linkedClearanceId, {
          adviseAgentStatusIndicator: status
        });
      }
      
      res.json(shipment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update clearance status" });
    }
  });

  // Update delivery booked status indicator
  app.patch("/api/import-shipments/:id/delivery-booked-status", async (req, res) => {
    try {
      const { status } = req.body;
      if (![1, 2, 3, 4].includes(status)) {
        return res.status(400).json({ error: "Status must be 1, 2, 3, or 4" });
      }
      const shipment = await storage.updateImportShipment(req.params.id, { 
        deliveryBookedStatusIndicator: status 
      });
      if (!shipment) {
        return res.status(404).json({ error: "Import shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update delivery booked status" });
    }
  });

  // Update haulier booking status indicator
  app.patch("/api/import-shipments/:id/haulier-booking-status", async (req, res) => {
    try {
      const { status } = req.body;
      if (![1, 2, 3, 4].includes(status)) {
        return res.status(400).json({ error: "Status must be 1, 2, 3, or 4" });
      }
      const shipment = await storage.updateImportShipment(req.params.id, { 
        haulierBookingStatusIndicator: status 
      });
      if (!shipment) {
        return res.status(404).json({ error: "Import shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update haulier booking status" });
    }
  });

  // Update container release status indicator
  app.patch("/api/import-shipments/:id/container-release-status", async (req, res) => {
    try {
      const { status } = req.body;
      if (![1, 2, 3, 4].includes(status)) {
        return res.status(400).json({ error: "Status must be 1, 2, 3, or 4" });
      }
      const shipment = await storage.updateImportShipment(req.params.id, { 
        containerReleaseStatusIndicator: status 
      });
      if (!shipment) {
        return res.status(404).json({ error: "Import shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update container release status" });
    }
  });

  // Update invoice customer status indicator
  app.patch("/api/import-shipments/:id/invoice-customer-status", async (req, res) => {
    try {
      const invoiceStatusSchema = z.object({
        status: z.union([z.literal(2), z.literal(3), z.null()]).optional()
      });
      const { status } = invoiceStatusSchema.parse(req.body);
      const shipment = await storage.updateImportShipment(req.params.id, { 
        invoiceCustomerStatusIndicator: status ?? null 
      });
      if (!shipment) {
        return res.status(404).json({ error: "Import shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid status value. Must be 2 (yellow), 3 (green), or null", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to update invoice customer status" });
    }
  });

  // Update send POD to customer status indicator
  app.patch("/api/import-shipments/:id/send-pod-to-customer-status", async (req, res) => {
    try {
      const sendPodStatusSchema = z.object({
        status: z.union([z.literal(2), z.literal(3), z.null()]).optional()
      });
      const { status } = sendPodStatusSchema.parse(req.body);
      const shipment = await storage.updateImportShipment(req.params.id, { 
        sendPodToCustomerStatusIndicator: status ?? null 
      });
      if (!shipment) {
        return res.status(404).json({ error: "Import shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid status value. Must be 2 (yellow), 3 (green), or null", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to update send POD to customer status" });
    }
  });

  // Delete file from attachments or proofOfDelivery
  app.delete("/api/import-shipments/:id/files", async (req, res) => {
    try {
      const deleteFileSchema = z.object({
        filePath: z.string(),
        fileType: z.enum(["attachment", "pod"])
      });
      const { filePath, fileType } = deleteFileSchema.parse(req.body);
      
      const shipment = await storage.getImportShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ error: "Import shipment not found" });
      }

      let updatedFiles;
      if (fileType === "attachment") {
        updatedFiles = (shipment.attachments || []).filter(f => f !== filePath);
        await storage.updateImportShipment(req.params.id, { attachments: updatedFiles });
      } else {
        updatedFiles = (shipment.proofOfDelivery || []).filter(f => f !== filePath);
        await storage.updateImportShipment(req.params.id, { proofOfDelivery: updatedFiles });
      }

      const updated = await storage.getImportShipment(req.params.id);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid file deletion request", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Delete import shipment
  app.delete("/api/import-shipments/:id", async (req, res) => {
    try {
      const success = await storage.deleteImportShipment(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Import shipment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete import shipment" });
    }
  });

  // ========== Export Shipments Routes ==========
  
  // Get all export shipments
  app.get("/api/export-shipments", async (_req, res) => {
    try {
      const shipments = await storage.getAllExportShipments();
      res.json(shipments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch export shipments" });
    }
  });

  // Get single export shipment
  app.get("/api/export-shipments/:id", async (req, res) => {
    try {
      const shipment = await storage.getExportShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ error: "Export shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch export shipment" });
    }
  });

  // Create export shipment
  app.post("/api/export-shipments", async (req, res) => {
    try {
      const validatedData = insertExportShipmentSchema.parse(req.body);
      const shipment = await storage.createExportShipment(validatedData);
      res.status(201).json(shipment);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          error: "Invalid export shipment data",
          details: error.errors 
        });
      }
      res.status(400).json({ error: "Invalid export shipment data" });
    }
  });

  // Update export shipment
  app.patch("/api/export-shipments/:id", async (req, res) => {
    try {
      // For updates, we make the validation less strict by not requiring all fields
      const shipment = await storage.updateExportShipment(req.params.id, req.body);
      if (!shipment) {
        return res.status(404).json({ error: "Export shipment not found" });
      }
      res.json(shipment);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          error: "Invalid export shipment data",
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to update export shipment" });
    }
  });

  // Delete export shipment
  app.delete("/api/export-shipments/:id", async (req, res) => {
    try {
      const success = await storage.deleteExportShipment(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Export shipment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete export shipment" });
    }
  });

  // ========== Custom Clearances Routes ==========
  
  // Get all custom clearances
  app.get("/api/custom-clearances", async (_req, res) => {
    try {
      const clearances = await storage.getAllCustomClearances();
      res.json(clearances);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch custom clearances" });
    }
  });

  // Get single custom clearance
  app.get("/api/custom-clearances/:id", async (req, res) => {
    try {
      const clearance = await storage.getCustomClearance(req.params.id);
      if (!clearance) {
        return res.status(404).json({ error: "Custom clearance not found" });
      }
      res.json(clearance);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch custom clearance" });
    }
  });

  // Create custom clearance
  app.post("/api/custom-clearances", async (req, res) => {
    try {
      const validatedData = insertCustomClearanceSchema.parse(req.body);
      const clearance = await storage.createCustomClearance(validatedData);
      res.status(201).json(clearance);
    } catch (error) {
      res.status(400).json({ error: "Invalid custom clearance data" });
    }
  });

  // Update custom clearance
  app.patch("/api/custom-clearances/:id", async (req, res) => {
    try {
      const validatedData = insertCustomClearanceSchema.partial().parse(req.body);
      const clearance = await storage.updateCustomClearance(req.params.id, validatedData);
      if (!clearance) {
        return res.status(404).json({ error: "Custom clearance not found" });
      }
      res.json(clearance);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid custom clearance data" });
      }
      res.status(500).json({ error: "Failed to update custom clearance" });
    }
  });

  // Delete custom clearance
  app.delete("/api/custom-clearances/:id", async (req, res) => {
    try {
      const success = await storage.deleteCustomClearance(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Custom clearance not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete custom clearance" });
    }
  });

  // Update advise agent status indicator
  app.patch("/api/custom-clearances/:id/advise-agent-status", async (req, res) => {
    try {
      const { status } = req.body;
      const clearance = await storage.updateCustomClearance(req.params.id, { 
        adviseAgentStatusIndicator: status 
      });
      if (!clearance) {
        return res.status(404).json({ error: "Custom clearance not found" });
      }
      
      // Sync to linked import shipment if it was created from import
      if (clearance.createdFromType === "import" && clearance.createdFromId) {
        await storage.updateImportShipment(clearance.createdFromId, {
          clearanceStatusIndicator: status
        });
      }
      
      res.json(clearance);
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // Update send entry to customer status indicator
  app.patch("/api/custom-clearances/:id/send-entry-status", async (req, res) => {
    try {
      const { status } = req.body;
      const clearance = await storage.updateCustomClearance(req.params.id, { 
        sendEntryToCustomerStatusIndicator: status 
      });
      if (!clearance) {
        return res.status(404).json({ error: "Custom clearance not found" });
      }
      res.json(clearance);
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // Update invoice customer status indicator
  app.patch("/api/custom-clearances/:id/invoice-status", async (req, res) => {
    try {
      const { status } = req.body;
      const clearance = await storage.updateCustomClearance(req.params.id, { 
        invoiceCustomerStatusIndicator: status 
      });
      if (!clearance) {
        return res.status(404).json({ error: "Custom clearance not found" });
      }
      res.json(clearance);
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // Update send cleared entry status indicator
  app.patch("/api/custom-clearances/:id/send-cleared-entry-status", async (req, res) => {
    try {
      const { status } = req.body;
      const clearance = await storage.getCustomClearance(req.params.id);
      if (!clearance) {
        return res.status(404).json({ error: "Custom clearance not found" });
      }
      if (clearance.jobType !== "import") {
        return res.status(400).json({ error: "This status is only for import clearances" });
      }
      const updated = await storage.updateCustomClearance(req.params.id, { 
        sendClearedEntryStatusIndicator: status 
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // ========== Object Storage Routes ==========

  // Get presigned upload URL for file uploads
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const filename = req.body?.filename;
      const uploadURL = await objectStorageService.getObjectEntityUploadURL(filename);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Download/serve uploaded files
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const decodedPath = decodeURIComponent(req.path);
      const objectFile = await objectStorageService.getObjectEntityFile(decodedPath);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error downloading object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Normalize and set ACL policy for uploaded files
  app.post("/api/objects/normalize", async (req, res) => {
    try {
      const urls = req.body.urls;
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: "urls array is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const paths: string[] = [];

      for (const url of urls) {
        const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
          url,
          {
            owner: "system",
            visibility: "public",
          }
        );
        paths.push(objectPath);
      }

      res.json({ paths });
    } catch (error) {
      console.error("Error normalizing object paths:", error);
      res.status(500).json({ error: "Failed to normalize object paths" });
    }
  });

  // ========== Backup Routes ==========

  // List all backups
  app.get("/api/backups", async (_req, res) => {
    try {
      const { readdirSync, readFileSync, statSync } = await import("fs");
      const { join } = await import("path");
      
      const backupsDir = "backups";
      const entries = readdirSync(backupsDir, { withFileTypes: true });
      const backups = [];
      
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith("backup_")) {
          const metadataPath = join(backupsDir, entry.name, "metadata.json");
          try {
            const metadata = JSON.parse(readFileSync(metadataPath, "utf-8"));
            const stats = statSync(join(backupsDir, entry.name));
            backups.push({
              ...metadata,
              createdAt: stats.birthtime.toISOString(),
            });
          } catch (error) {
            // Skip backups without metadata
            console.warn(`Skipping backup ${entry.name}: no metadata found`);
          }
        }
      }
      
      // Sort by timestamp, newest first
      backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      res.json(backups);
    } catch (error) {
      console.error("List backups error:", error);
      res.status(500).json({ error: "Failed to list backups" });
    }
  });

  // Create backup of all contact databases
  app.post("/api/backups/create", async (_req, res) => {
    try {
      const { execSync } = await import("child_process");
      const result = execSync("tsx scripts/backup-contact-databases.ts", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      
      // Parse the output to get backup name
      const backupNameMatch = result.match(/Backup name: (backup_[^\n]+)/);
      const backupName = backupNameMatch ? backupNameMatch[1] : null;
      
      if (!backupName) {
        throw new Error("Failed to extract backup name");
      }
      
      // Read metadata file
      const { readFileSync } = await import("fs");
      const metadata = JSON.parse(readFileSync(`backups/${backupName}/metadata.json`, "utf-8"));
      
      res.json({
        success: true,
        ...metadata,
      });
    } catch (error) {
      console.error("Backup error:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  // Restore from specific backup
  app.post("/api/backups/restore/:backupName", async (req, res) => {
    try {
      const { backupName } = req.params;
      const { tables } = req.body;
      const { execSync } = await import("child_process");
      
      // Validate tables array
      if (!tables || !Array.isArray(tables) || tables.length === 0) {
        return res.status(400).json({ error: "tables array is required and must not be empty" });
      }
      
      // Pass tables as JSON string argument
      const tablesJson = JSON.stringify(tables);
      const result = execSync(`tsx scripts/restore-contact-databases.ts ${backupName} '${tablesJson}'`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      
      // Parse the output to get restore statistics
      const lines = result.split("\n");
      const restoredTables = [];
      let totalRecords = 0;
      
      for (const line of lines) {
        const match = line.match(/✓ (.+) restored: (\d+) records/);
        if (match) {
          const count = parseInt(match[2]);
          restoredTables.push({
            name: match[1],
            count: count,
          });
          totalRecords += count;
        }
      }
      
      res.json({
        success: true,
        backupName,
        timestamp: new Date().toISOString(),
        tables: restoredTables,
        totalRecords,
      });
    } catch (error) {
      console.error("Restore error:", error);
      res.status(500).json({ error: "Failed to restore backup" });
    }
  });

  // Delete specific backup
  app.delete("/api/backups/:backupName", async (req, res) => {
    try {
      const { backupName } = req.params;
      const { rmSync } = await import("fs");
      const { join } = await import("path");
      
      // Validate backup name to prevent directory traversal
      if (!backupName.startsWith("backup_") || backupName.includes("..")) {
        return res.status(400).json({ error: "Invalid backup name" });
      }
      
      const backupPath = join("backups", backupName);
      rmSync(backupPath, { recursive: true, force: true });
      
      res.json({
        success: true,
        message: `Backup ${backupName} deleted successfully`,
      });
    } catch (error) {
      console.error("Delete backup error:", error);
      res.status(500).json({ error: "Failed to delete backup" });
    }
  });

  // ========== Terminal49 Container Tracking Routes ==========
  
  const TERMINAL49_API_KEY = process.env.TERMINAL49_API_KEY;
  const TERMINAL49_BASE_URL = "https://api.terminal49.com/v2";

  // Create tracking request for a container
  app.post("/api/terminal49/track", async (req, res) => {
    try {
      const { containerNumber, shippingLine, billOfLading } = req.body;
      
      if (!TERMINAL49_API_KEY) {
        return res.status(500).json({ error: "Terminal49 API key not configured" });
      }

      // Determine request type and number
      let requestType = "container";
      let requestNumber = containerNumber;
      
      if (billOfLading) {
        requestType = "bill_of_lading";
        requestNumber = billOfLading;
      }

      // Extract SCAC code from first 4 characters of container number
      const scacCode = containerNumber?.substring(0, 4)?.toUpperCase() || shippingLine || null;

      const response = await fetch(`${TERMINAL49_BASE_URL}/tracking_requests`, {
        method: "POST",
        headers: {
          "Authorization": `Token ${TERMINAL49_API_KEY}`,
          "Content-Type": "application/vnd.api+json",
        },
        body: JSON.stringify({
          data: {
            type: "tracking_request",
            attributes: {
              request_type: requestType,
              request_number: requestNumber,
              scac: scacCode,
            },
          },
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error("Terminal49 API error:", response.status, JSON.stringify(data, null, 2));
        
        // Add helpful message for SCAC not recognized
        const scacError = data.errors?.find((e: any) => e.code === 'not_recognized' && e.source?.pointer?.includes('scac'));
        if (scacError) {
          return res.status(response.status).json({ 
            error: "Shipping line SCAC code not recognized", 
            message: `The shipping line code '${scacCode}' (from container number) is not recognized by Terminal49. Common codes: MAEU (Maersk), MSCU (MSC), CMDU (CMA CGM), HLCU (Hapag-Lloyd)`,
            details: data 
          });
        }
        
        return res.status(response.status).json({ 
          error: "Terminal49 API error", 
          details: data 
        });
      }

      res.json(data);
    } catch (error) {
      console.error("Terminal49 track error:", error);
      res.status(500).json({ error: "Failed to create tracking request" });
    }
  });

  // Get shipment details by ID
  app.get("/api/terminal49/shipments/:id", async (req, res) => {
    try {
      if (!TERMINAL49_API_KEY) {
        return res.status(500).json({ error: "Terminal49 API key not configured" });
      }

      const response = await fetch(
        `${TERMINAL49_BASE_URL}/shipments/${req.params.id}?include=containers,transport_events,terminal_events`,
        {
          headers: {
            "Authorization": `Token ${TERMINAL49_API_KEY}`,
            "Content-Type": "application/vnd.api+json",
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        console.error("Terminal49 API error:", response.status, JSON.stringify(data, null, 2));
        return res.status(response.status).json({ 
          error: "Terminal49 API error", 
          details: data 
        });
      }

      res.json(data);
    } catch (error) {
      console.error("Terminal49 shipment error:", error);
      res.status(500).json({ error: "Failed to get shipment details" });
    }
  });

  // List all tracked shipments
  app.get("/api/terminal49/shipments", async (req, res) => {
    try {
      if (!TERMINAL49_API_KEY) {
        return res.status(500).json({ error: "Terminal49 API key not configured" });
      }

      const response = await fetch(
        `${TERMINAL49_BASE_URL}/shipments?include=containers`,
        {
          headers: {
            "Authorization": `Token ${TERMINAL49_API_KEY}`,
            "Content-Type": "application/vnd.api+json",
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        console.error("Terminal49 API error:", response.status, JSON.stringify(data, null, 2));
        return res.status(response.status).json({ 
          error: "Terminal49 API error", 
          details: data 
        });
      }

      res.json(data);
    } catch (error) {
      console.error("Terminal49 list shipments error:", error);
      res.status(500).json({ error: "Failed to list shipments" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}