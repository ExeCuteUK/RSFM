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
      const shipment = await storage.updateImportShipment(req.params.id, req.body);
      if (!shipment) {
        return res.status(404).json({ error: "Import shipment not found" });
      }
      res.json(shipment);
    } catch (error: any) {
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

  const httpServer = createServer(app);

  return httpServer;
}