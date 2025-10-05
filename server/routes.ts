import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import path from "path";
import multer from "multer";
import fs from "fs/promises";
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
  insertCustomClearanceSchema,
  insertUserSchema,
  updateUserSchema,
  type User
} from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import passport from "passport";
import { registerUser } from "./auth";
import bcrypt from "bcryptjs";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Auth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && (req.user as User).isAdmin) {
    return next();
  }
  res.status(403).json({ error: "Admin access required" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ========== Auth Routes ==========
  
  // Check auth status - returns 200 with user:null when not authenticated to avoid redirect loops
  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as User;
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } else {
      res.json({ user: null });
    }
  });

  // Login
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: User, info: { message: string }) => {
      if (err) {
        return res.status(500).json({ error: "Login failed" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed" });
        }
        const { password, ...userWithoutPassword } = user;
        return res.json({ user: userWithoutPassword });
      });
    })(req, res, next);
  });

  // Register (only if no users exist)
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Check if any users already exist
      const users = await storage.getAllUsers();
      if (users.length > 0) {
        return res.status(403).json({ error: "Registration is closed. Please contact an administrator." });
      }

      const validatedData = insertUserSchema.parse(req.body);
      const user = await registerUser(storage, validatedData);
      
      req.logIn(user, (err) => {
        if (err) {
          console.error("Login after registration failed:", err);
          return res.status(500).json({ error: "Registration succeeded but login failed" });
        }
        const { password, ...userWithoutPassword } = user;
        return res.status(201).json({ user: userWithoutPassword });
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      } else {
        return res.status(400).json({ error: "Registration failed" });
      }
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Check if registration is allowed (no users exist)
  app.get("/api/auth/registration-allowed", async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ allowed: users.length === 0 });
    } catch (error) {
      res.status(500).json({ error: "Failed to check registration status" });
    }
  });

  // ========== User Management Routes (Admin only) ==========
  
  // Create new user (Admin only)
  app.post("/api/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      const newUser = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });
      
      const { password, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Failed to create user" });
      }
    }
  });
  
  // Get all users
  app.get("/api/users", requireAuth, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, gmailAccessToken, gmailRefreshToken, gmailTokenExpiry, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get single user
  app.get("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const requestingUser = req.user as User;
      const requestedUserId = req.params.id;
      
      // Users can only view their own profile unless admin
      if (!requestingUser.isAdmin && requestingUser.id !== requestedUserId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const user = await storage.getUser(requestedUserId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Update user
  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const requestingUser = req.user as User;
      const targetUserId = req.params.id;
      
      // Users can only update their own profile unless admin
      if (!requestingUser.isAdmin && requestingUser.id !== targetUserId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const validatedData = updateUserSchema.parse(req.body);
      
      // Non-admins cannot change admin status
      if (!requestingUser.isAdmin && validatedData.isAdmin !== undefined) {
        return res.status(403).json({ error: "Cannot modify admin status" });
      }
      
      const user = await storage.updateUser(targetUserId, validatedData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Delete user (Admin only)
  app.delete("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const requestingUser = req.user as User;
      const targetUserId = req.params.id;
      
      // Prevent self-deletion
      if (requestingUser.id === targetUserId) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      
      const success = await storage.deleteUser(targetUserId);
      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Presence tracking routes
  app.post("/api/presence/heartbeat", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      await storage.updateUserActivity(user.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update presence" });
    }
  });

  app.get("/api/presence/online-users", requireAuth, async (_req, res) => {
    try {
      const onlineUserIds = await storage.getOnlineUsers();
      res.json(onlineUserIds);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch online users" });
    }
  });

  // ========== Message Routes ==========
  
  // Get messages for current user
  app.get("/api/messages", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const messages = await storage.getMessagesByUser(user.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Get unread count for current user
  app.get("/api/messages/unread-count", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const count = await storage.getUnreadCount(user.id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // Create a new message
  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const message = await storage.createMessage({
        ...req.body,
        senderId: user.id,
      });
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ error: "Failed to create message" });
    }
  });

  // Mark message as read
  app.patch("/api/messages/:id/read", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const message = await storage.getMessage(req.params.id);
      
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      // Only recipient can mark as read
      if (message.recipientId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updated = await storage.markMessageAsRead(req.params.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });

  // Delete message
  app.delete("/api/messages/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const message = await storage.getMessage(req.params.id);
      
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      // Only sender or recipient can delete
      if (message.senderId !== user.id && message.recipientId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const success = await storage.deleteMessage(req.params.id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  // ========== Job History Routes ==========
  
  // Get import shipments by customer ID
  app.get("/api/import-customers/:id/shipments", requireAuth, async (req, res) => {
    try {
      const shipments = await storage.getImportShipmentsByCustomerId(req.params.id);
      res.json(shipments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch import shipments" });
    }
  });

  // Get export shipments by customer ID
  app.get("/api/export-customers/:id/shipments", requireAuth, async (req, res) => {
    try {
      const shipments = await storage.getExportShipmentsByCustomerId(req.params.id);
      res.json(shipments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch export shipments" });
    }
  });

  // ========== Import Customers Routes ==========
  // ========== Import Customers Routes ==========
  
  // Search import customers
  app.get("/api/import-customers/search", async (req, res) => {
    try {
      const query = (req.query.query as string) || '';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 25;
      const customers = await storage.searchImportCustomers(query, limit);
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to search import customers" });
    }
  });
  
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
  
  // Search export customers
  app.get("/api/export-customers/search", async (req, res) => {
    try {
      const query = (req.query.query as string) || '';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 25;
      const customers = await storage.searchExportCustomers(query, limit);
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to search export customers" });
    }
  });
  
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
  
  // Search export receivers
  app.get("/api/export-receivers/search", async (req, res) => {
    try {
      const query = (req.query.query as string) || '';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 25;
      const receivers = await storage.searchExportReceivers(query, limit);
      res.json(receivers);
    } catch (error) {
      res.status(500).json({ error: "Failed to search export receivers" });
    }
  });
  
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

  // Get all contact emails for autocomplete
  app.get("/api/contacts/emails", async (_req, res) => {
    try {
      const importCustomers = await storage.getAllImportCustomers();
      const exportCustomers = await storage.getAllExportCustomers();
      
      console.log(`Found ${importCustomers.length} import customers, ${exportCustomers.length} export customers`);
      
      const emails: Array<{ email: string; name: string; type: string }> = [];
      
      // Collect import customer emails
      importCustomers.forEach(customer => {
        if (customer.email && Array.isArray(customer.email)) {
          customer.email.forEach(email => {
            if (email && email.trim()) {
              emails.push({ email: email.trim(), name: customer.companyName || '', type: 'Import Customer' });
            }
          });
        }
        if (customer.accountsEmail && Array.isArray(customer.accountsEmail)) {
          customer.accountsEmail.forEach(email => {
            if (email && email.trim()) {
              emails.push({ email: email.trim(), name: customer.companyName || '', type: 'Import Customer' });
            }
          });
        }
      });
      
      // Collect export customer emails
      exportCustomers.forEach(customer => {
        if (customer.email && Array.isArray(customer.email)) {
          customer.email.forEach(email => {
            if (email && email.trim()) {
              emails.push({ email: email.trim(), name: customer.companyName || '', type: 'Export Customer' });
            }
          });
        }
        if (customer.accountsEmail && Array.isArray(customer.accountsEmail)) {
          customer.accountsEmail.forEach(email => {
            if (email && email.trim()) {
              emails.push({ email: email.trim(), name: customer.companyName || '', type: 'Export Customer' });
            }
          });
        }
      });
      
      console.log(`Collected ${emails.length} total emails before deduplication`);
      
      // Remove duplicates and sort
      const uniqueEmails = Array.from(new Map(emails.map(item => [item.email, item])).values());
      uniqueEmails.sort((a, b) => a.email.localeCompare(b.email));
      
      console.log(`Returning ${uniqueEmails.length} unique emails`);
      
      res.json(uniqueEmails);
    } catch (error) {
      console.error("Error fetching contact emails:", error);
      res.status(500).json({ error: "Failed to fetch contact emails" });
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
      
      // Sync attachments to job_file_groups
      if (shipment.attachments && shipment.attachments.length > 0) {
        const existingGroup = await storage.getJobFileGroupByJobRef(shipment.jobRef);
        if (existingGroup) {
          await storage.updateJobFileGroup(shipment.jobRef, {
            documents: shipment.attachments,
          });
        } else {
          await storage.createJobFileGroup({
            jobRef: shipment.jobRef,
            documents: shipment.attachments,
            rsInvoices: [],
          });
        }
      }
      
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
      
      // Sync attachments to job_file_groups if they were updated
      if (req.body.attachments !== undefined) {
        const existingGroup = await storage.getJobFileGroupByJobRef(shipment.jobRef);
        if (existingGroup) {
          await storage.updateJobFileGroup(shipment.jobRef, {
            documents: shipment.attachments || [],
          });
        } else if (shipment.attachments && shipment.attachments.length > 0) {
          await storage.createJobFileGroup({
            jobRef: shipment.jobRef,
            documents: shipment.attachments,
            rsInvoices: [],
          });
        }
      }
      
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
        
        // Also remove from job_file_groups if shipment has a jobRef
        if (shipment.jobRef) {
          const fileGroup = await storage.getJobFileGroupByJobRef(shipment.jobRef);
          if (fileGroup) {
            const updatedDocs = (fileGroup.documents || []).filter(f => f !== filePath);
            await storage.updateJobFileGroup(shipment.jobRef, { documents: updatedDocs });
          }
        }
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
      
      // Sync attachments to job_file_groups
      if (shipment.attachments && shipment.attachments.length > 0) {
        const existingGroup = await storage.getJobFileGroupByJobRef(shipment.jobRef);
        if (existingGroup) {
          await storage.updateJobFileGroup(shipment.jobRef, {
            documents: shipment.attachments,
          });
        } else {
          await storage.createJobFileGroup({
            jobRef: shipment.jobRef,
            documents: shipment.attachments,
            rsInvoices: [],
          });
        }
      }
      
      // Sync attachments to linked custom clearance's transport documents
      if (shipment.linkedClearanceId && shipment.attachments) {
        await storage.updateCustomClearance(shipment.linkedClearanceId, {
          transportDocuments: shipment.attachments,
        });
      }
      
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
      
      // Sync attachments to job_file_groups if they were updated
      if (req.body.attachments !== undefined) {
        const existingGroup = await storage.getJobFileGroupByJobRef(shipment.jobRef);
        if (existingGroup) {
          await storage.updateJobFileGroup(shipment.jobRef, {
            documents: shipment.attachments || [],
          });
        } else if (shipment.attachments && shipment.attachments.length > 0) {
          await storage.createJobFileGroup({
            jobRef: shipment.jobRef,
            documents: shipment.attachments,
            rsInvoices: [],
          });
        }
        
        // Sync attachments to linked custom clearance's transport documents
        if (shipment.linkedClearanceId) {
          await storage.updateCustomClearance(shipment.linkedClearanceId, {
            transportDocuments: shipment.attachments || [],
          });
        }
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
      
      // Sync documents to job_file_groups
      const allDocs = [
        ...(clearance.transportDocuments || []),
        ...(clearance.clearanceDocuments || [])
      ];
      
      if (allDocs.length > 0) {
        const existingGroup = await storage.getJobFileGroupByJobRef(clearance.jobRef);
        if (existingGroup) {
          // Merge with existing documents to avoid duplicates
          const mergedDocs = [...new Set([...(existingGroup.documents || []), ...allDocs])];
          await storage.updateJobFileGroup(clearance.jobRef, {
            documents: mergedDocs,
          });
        } else {
          await storage.createJobFileGroup({
            jobRef: clearance.jobRef,
            documents: allDocs,
            rsInvoices: [],
          });
        }
      }
      
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
      
      // Sync documents to job_file_groups if they were updated
      if (req.body.transportDocuments !== undefined || req.body.clearanceDocuments !== undefined) {
        const allDocs = [
          ...(clearance.transportDocuments || []),
          ...(clearance.clearanceDocuments || [])
        ];
        
        const existingGroup = await storage.getJobFileGroupByJobRef(clearance.jobRef);
        if (existingGroup) {
          // Merge with existing documents to avoid duplicates
          const mergedDocs = [...new Set(allDocs)];
          await storage.updateJobFileGroup(clearance.jobRef, {
            documents: mergedDocs,
          });
        } else if (allDocs.length > 0) {
          await storage.createJobFileGroup({
            jobRef: clearance.jobRef,
            documents: allDocs,
            rsInvoices: [],
          });
        }
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

  // ========== Job File Groups (Shared document storage) ==========
  
  // Get job file group by jobRef
  app.get("/api/job-file-groups/:jobRef", async (req, res) => {
    try {
      const jobRef = parseInt(req.params.jobRef);
      if (isNaN(jobRef)) {
        return res.status(400).json({ error: "Invalid job reference" });
      }
      
      const group = await storage.getJobFileGroupByJobRef(jobRef);
      if (!group) {
        return res.status(404).json({ error: "Job file group not found" });
      }
      
      res.json(group);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch job file group" });
    }
  });

  // Update job file group documents
  app.patch("/api/job-file-groups/:jobRef/documents", async (req, res) => {
    try {
      const jobRef = parseInt(req.params.jobRef);
      if (isNaN(jobRef)) {
        return res.status(400).json({ error: "Invalid job reference" });
      }
      
      const { documents } = req.body;
      if (!Array.isArray(documents)) {
        return res.status(400).json({ error: "Documents must be an array" });
      }
      
      // Check if group exists, create if not
      let group = await storage.getJobFileGroupByJobRef(jobRef);
      
      if (!group) {
        group = await storage.createJobFileGroup({
          jobRef,
          documents,
          rsInvoices: [],
        });
      } else {
        group = await storage.updateJobFileGroup(jobRef, { documents });
      }
      
      if (!group) {
        return res.status(404).json({ error: "Failed to update job file group" });
      }
      
      res.json(group);
    } catch (error) {
      console.error("Error updating documents:", error);
      res.status(500).json({ error: "Failed to update documents" });
    }
  });

  // Update job file group R.S invoices
  app.patch("/api/job-file-groups/:jobRef/rs-invoices", async (req, res) => {
    try {
      const jobRef = parseInt(req.params.jobRef);
      if (isNaN(jobRef)) {
        return res.status(400).json({ error: "Invalid job reference" });
      }
      
      const { rsInvoices } = req.body;
      if (!Array.isArray(rsInvoices)) {
        return res.status(400).json({ error: "R.S Invoices must be an array" });
      }
      
      // Check if group exists, create if not
      let group = await storage.getJobFileGroupByJobRef(jobRef);
      
      if (!group) {
        group = await storage.createJobFileGroup({
          jobRef,
          documents: [],
          rsInvoices,
        });
      } else {
        group = await storage.updateJobFileGroup(jobRef, { rsInvoices });
      }
      
      if (!group) {
        return res.status(404).json({ error: "Failed to update job file group" });
      }
      
      res.json(group);
    } catch (error) {
      console.error("Error updating R.S invoices:", error);
      res.status(500).json({ error: "Failed to update R.S invoices" });
    }
  });

  // ========== Static Assets ==========
  
  // Serve company logo for email signatures
  app.get("/assets/rs-logo.jpg", (_req, res) => {
    res.sendFile(path.join(process.cwd(), "attached_assets", "rs-logo.jpg"));
  });

  // ========== Signature Template & Logo Management ==========
  
  // Upload signature HTML template
  app.post("/api/signature/upload-template", requireAuth, upload.single("template"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      if (req.file.mimetype !== "text/html") {
        return res.status(400).json({ error: "Only HTML files are allowed" });
      }
      
      const templatePath = path.join(process.cwd(), "attached_assets", "signature-template.html");
      await fs.writeFile(templatePath, req.file.buffer);
      
      res.json({ message: "Template uploaded successfully" });
    } catch (error) {
      console.error("Error uploading template:", error);
      res.status(500).json({ error: "Failed to upload template" });
    }
  });
  
  // Download signature HTML template
  app.get("/api/signature/download-template", requireAuth, async (_req, res) => {
    try {
      const templatePath = path.join(process.cwd(), "attached_assets", "signature-template.html");
      res.download(templatePath, "signature-template.html");
    } catch (error) {
      res.status(404).json({ error: "Template not found" });
    }
  });
  
  // Upload signature logo
  app.post("/api/signature/upload-logo", requireAuth, upload.single("logo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      if (!req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({ error: "Only image files are allowed" });
      }
      
      const logoPath = path.join(process.cwd(), "attached_assets", "rs-logo.jpg");
      await fs.writeFile(logoPath, req.file.buffer);
      
      res.json({ message: "Logo uploaded successfully" });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ error: "Failed to upload logo" });
    }
  });
  
  // Download signature logo
  app.get("/api/signature/download-logo", requireAuth, (_req, res) => {
    const logoPath = path.join(process.cwd(), "attached_assets", "rs-logo.jpg");
    res.download(logoPath, "rs-logo.jpg");
  });

  // Restore default signature template and logo
  app.post("/api/signature/restore-defaults", requireAuth, async (_req, res) => {
    try {
      const defaultTemplatePath = path.join(process.cwd(), "attached_assets", "signature-template-default.html");
      const defaultLogoPath = path.join(process.cwd(), "attached_assets", "rs-logo-default.jpg");
      const templatePath = path.join(process.cwd(), "attached_assets", "signature-template.html");
      const logoPath = path.join(process.cwd(), "attached_assets", "rs-logo.jpg");

      // Copy defaults to active files
      await fs.copyFile(defaultTemplatePath, templatePath);
      await fs.copyFile(defaultLogoPath, logoPath);

      res.json({ message: "Default signature restored successfully" });
    } catch (error) {
      console.error("Error restoring defaults:", error);
      res.status(500).json({ error: "Failed to restore defaults" });
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

  // OCR text extraction from uploaded files
  app.post("/api/objects/ocr", async (req, res) => {
    try {
      const { objectPath } = req.body;
      if (!objectPath) {
        return res.status(400).json({ error: "objectPath is required" });
      }

      const fileExtension = objectPath.toLowerCase().split('.').pop();
      const supportedImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'];
      const isPDF = fileExtension === 'pdf';
      const isImage = supportedImageTypes.includes(fileExtension || '');
      
      if (!isPDF && !isImage) {
        return res.status(400).json({ 
          error: "OCR only supports image files (JPG, PNG, GIF, BMP, TIFF, WEBP) and PDF files." 
        });
      }

      const objectStorageService = new ObjectStorageService();
      
      // Normalize the path if it's a full URL
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(objectPath);
      
      // Download the file from object storage
      const fileBuffer = await objectStorageService.getObjectBuffer(normalizedPath);
      
      if (isPDF) {
        // Use Scribe.js for PDF OCR
        const scribe = (await import("scribe.js-ocr")).default;
        const fs = await import("fs");
        const path = await import("path");
        const os = await import("os");
        
        // Create a temporary file for the PDF
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `ocr-${Date.now()}.pdf`);
        
        try {
          // Write buffer to temp file
          fs.writeFileSync(tempFilePath, fileBuffer);
          
          // Extract text using Scribe.js
          const result = await scribe.extractText([tempFilePath]);
          
          // Clean up temp file
          fs.unlinkSync(tempFilePath);
          
          // Scribe.js returns the extracted text directly as a string
          let extractedText = "";
          if (typeof result === 'string') {
            extractedText = result;
          } else if (result && typeof result === 'object') {
            // Fallback: try different possible result structures
            if (result.text) {
              extractedText = result.text;
            } else if (result.pages && Array.isArray(result.pages)) {
              extractedText = result.pages.map((p: any) => p.text || '').join('\n');
            } else if (Array.isArray(result)) {
              extractedText = result.map((p: any) => p.text || '').join('\n');
            }
          }
          
          res.json({ 
            text: extractedText || "No text found in PDF",
            confidence: 95, // Scribe.js doesn't provide confidence, use default
            filename: objectPath.split('/').pop(),
            engine: 'scribe.js'
          });
        } catch (scribeError) {
          console.error("[DEBUG-OCR] Scribe.js error:", scribeError);
          // Clean up temp file on error
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
          throw scribeError;
        }
      } else {
        // Use Tesseract.js for image OCR
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker('eng');
        
        try {
          // Recognize text from the buffer
          const { data: { text, confidence } } = await worker.recognize(fileBuffer);
          
          await worker.terminate();
          
          res.json({ 
            text, 
            confidence,
            filename: objectPath.split('/').pop(),
            engine: 'tesseract.js'
          });
        } catch (ocrError) {
          await worker.terminate();
          throw ocrError;
        }
      }
    } catch (error) {
      console.error("Error performing OCR:", error);
      res.status(500).json({ error: "Failed to extract text from file" });
    }
  });

  // ========== Backup Routes (Admin only) ==========

  // List all backups
  app.get("/api/backups", requireAuth, requireAdmin, async (_req, res) => {
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
  app.post("/api/backups/create", requireAuth, requireAdmin, async (_req, res) => {
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
  app.post("/api/backups/restore/:backupName", requireAuth, requireAdmin, async (req, res) => {
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
  app.delete("/api/backups/:backupName", requireAuth, requireAdmin, async (req, res) => {
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

  // Mapping of shipping line names to SCAC codes
  const SHIPPING_LINE_SCAC_MAP: Record<string, string> = {
    // Cosco
    "cosco": "COSU",
    "cosco shipping lines": "COSU",
    "cosco shipping": "COSU",
    
    // Maersk
    "maersk": "MAEU",
    "maersk line": "MAEU",
    
    // MSC
    "msc": "MSCU",
    "mediterranean shipping company": "MSCU",
    
    // CMA CGM
    "cma cgm": "CMDU",
    "cma-cgm": "CMDU",
    
    // Hapag-Lloyd
    "hapag lloyd": "HLCU",
    "hapag-lloyd": "HLCU",
    
    // ONE (Ocean Network Express)
    "one": "ONEY",
    "ocean network express": "ONEY",
    
    // Evergreen
    "evergreen": "EGLV",
    "evergreen line": "EGLV",
    
    // Yang Ming
    "yang ming": "YMLU",
    
    // ZIM
    "zim": "ZIMU",
    
    // PIL (Pacific International Lines)
    "pil": "PCIU",
    "pacific international lines": "PCIU",
    
    // HMM (Hyundai Merchant Marine)
    "hmm": "HDMU",
    "hyundai": "HDMU",
    
    // OOCL (Orient Overseas Container Line)
    "oocl": "OOLU",
    
    // K Line
    "k line": "KKLU",
    "kawasaki kisen": "KKLU",
  };

  // Helper function to get SCAC code from shipping line name
  function getSCACFromShippingLine(shippingLineName: string | null | undefined): string | null {
    if (!shippingLineName) return null;
    
    const normalizedName = shippingLineName.toLowerCase().trim();
    return SHIPPING_LINE_SCAC_MAP[normalizedName] || null;
  }

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

      // Try to get SCAC code from shipping line name lookup, fallback to container number first 4 chars
      let scacCode = getSCACFromShippingLine(shippingLine);
      
      if (!scacCode && containerNumber) {
        // Fallback: Extract from first 4 characters of container number
        scacCode = containerNumber.substring(0, 4).toUpperCase();
      }

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
        
        // Handle duplicate tracking request - container already being tracked
        const duplicateError = data.errors?.find((e: any) => e.code === 'duplicate');
        if (duplicateError) {
          try {
            // Fetch all shipments and find the matching one
            const shipmentsResponse = await fetch(
              `${TERMINAL49_BASE_URL}/shipments?include=containers`,
              {
                headers: {
                  "Authorization": `Token ${TERMINAL49_API_KEY}`,
                  "Content-Type": "application/vnd.api+json",
                },
              }
            );
            
            if (shipmentsResponse.ok) {
              const shipmentsData = await shipmentsResponse.json();
              
              // Find the shipment that matches our container
              // Check both bill_of_lading_number and containers array
              const shipment = shipmentsData.data?.find((s: any) => {
                // Check bill of lading number
                if (s.attributes?.bill_of_lading_number === requestNumber) {
                  return true;
                }
                // Check containers array
                if (s.attributes?.containers?.some((c: any) => c.number === requestNumber)) {
                  return true;
                }
                return false;
              });
              
              if (shipment) {
                // Return a response with the shipment ID
                return res.json({
                  data: {
                    id: duplicateError.meta?.tracking_request_id,
                    type: "tracking_request",
                    attributes: {
                      status: "created",
                    },
                    relationships: {
                      tracked_object: {
                        data: {
                          id: shipment.id,
                          type: "shipment"
                        }
                      }
                    }
                  }
                });
              }
            }
          } catch (e) {
            console.error("Error fetching shipments:", e);
          }
          
          // Fallback: Direct to Terminal49 website
          return res.json({
            data: {
              id: duplicateError.meta?.tracking_request_id,
              type: "tracking_request",
              attributes: {
                status: "view_on_terminal49",
                request_number: requestNumber,
              },
              meta: {
                terminal49_url: `https://app.terminal49.com/shipments`
              }
            }
          });
        }
        
        // Add helpful message for SCAC not recognized
        const scacError = data.errors?.find((e: any) => e.code === 'not_recognized' && e.source?.pointer?.includes('scac'));
        if (scacError) {
          const source = getSCACFromShippingLine(shippingLine) ? `shipping line "${shippingLine}"` : "container number";
          return res.status(response.status).json({ 
            error: "Shipping line SCAC code not recognized", 
            message: `The shipping line code '${scacCode}' (from ${source}) is not recognized by Terminal49. Please check the shipping line name or contact support.`,
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

      // Workaround: API key can't fetch individual shipments, so fetch all and filter
      const response = await fetch(
        `${TERMINAL49_BASE_URL}/shipments`,
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

      // Find the requested shipment
      const shipment = data.data?.find((s: any) => s.id === req.params.id);
      
      if (!shipment) {
        return res.status(404).json({ error: "Shipment not found" });
      }

      // Return in the same format as the individual endpoint would
      res.json({
        data: shipment,
        included: data.included?.filter((inc: any) => {
          // Filter included records related to this shipment
          return inc.relationships?.shipment?.data?.id === req.params.id;
        })
      });
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

  // ========== Gmail Routes (Per-User OAuth) ==========
  
  // Get OAuth URL for Gmail connection
  app.get("/api/gmail/auth-url", requireAuth, async (req, res) => {
    try {
      const { google } = await import("googleapis");
      // Use REPLIT_DEV_DOMAIN for dev, or construct production URL
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPL_SLUG 
          ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
          : 'http://localhost:5000';
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        `${baseUrl}/api/gmail/callback`
      );

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.compose',
          'https://www.googleapis.com/auth/userinfo.email',
        ],
        state: (req.user as User).id, // Pass user ID as state
        prompt: 'consent', // Force consent to get refresh token
      });

      res.json({ authUrl });
    } catch (error) {
      console.error("Gmail auth URL error:", error);
      res.status(500).json({ error: "Failed to generate authorization URL" });
    }
  });

  // Handle OAuth callback
  app.get("/api/gmail/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      const userId = state as string;

      if (!code || !userId) {
        return res.status(400).send("Missing authorization code or user ID");
      }

      const { google } = await import("googleapis");
      // Use REPLIT_DEV_DOMAIN for dev, or construct production URL
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPL_SLUG 
          ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
          : 'http://localhost:5000';
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        `${baseUrl}/api/gmail/callback`
      );

      const { tokens } = await oauth2Client.getToken(code as string);
      oauth2Client.setCredentials(tokens);

      // Get user's email address
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data } = await oauth2.userinfo.get();

      // Store tokens in user record
      await storage.updateUser(userId, {
        gmailAccessToken: tokens.access_token || null,
        gmailRefreshToken: tokens.refresh_token || null,
        gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        gmailEmail: data.email || null,
      });

      // Redirect to settings page
      res.send(`
        <html>
          <body>
            <h1>Gmail Connected Successfully!</h1>
            <p>Your Gmail account has been connected. You can close this window and return to the application.</p>
            <script>
              setTimeout(() => {
                window.location.href = '/settings?tab=email';
              }, 2000);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Gmail callback error:", error);
      res.status(500).send("Failed to connect Gmail account");
    }
  });

  // Disconnect Gmail
  app.post("/api/gmail/disconnect", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      await storage.updateUser(user.id, {
        gmailAccessToken: null,
        gmailRefreshToken: null,
        gmailTokenExpiry: null,
        gmailEmail: null,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Gmail disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect Gmail" });
    }
  });
  
  // Get Gmail connection status (per-user)
  app.get("/api/gmail/status", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      res.json({ 
        connected: !!user.gmailEmail, 
        email: user.gmailEmail 
      });
    } catch (error) {
      res.json({ connected: false, email: null });
    }
  });

  // Send email with attachment (per-user Gmail OAuth)
  app.post("/api/gmail/send", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { to, subject, body, attachmentUrl, attachmentFilename } = req.body;
      
      if (!to || !subject || !attachmentUrl || !attachmentFilename) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if user has Gmail connected
      if (!user.gmailAccessToken || !user.gmailRefreshToken) {
        return res.status(401).json({ error: "Gmail not connected. Please connect your Gmail account in Settings." });
      }

      const { google } = await import("googleapis");
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET
      );

      // Set credentials with refresh token support
      oauth2Client.setCredentials({
        access_token: user.gmailAccessToken,
        refresh_token: user.gmailRefreshToken,
        expiry_date: user.gmailTokenExpiry ? new Date(user.gmailTokenExpiry).getTime() : undefined,
      });

      // Auto-refresh access token if expired
      oauth2Client.on('tokens', async (tokens) => {
        if (tokens.access_token) {
          await storage.updateUser(user.id, {
            gmailAccessToken: tokens.access_token,
            gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
          });
        }
      });

      // Convert relative URL to absolute if needed
      let fullAttachmentUrl = attachmentUrl;
      if (attachmentUrl.startsWith('/')) {
        const baseUrl = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : process.env.REPL_SLUG 
            ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
            : 'http://localhost:5000';
        fullAttachmentUrl = `${baseUrl}${attachmentUrl}`;
      }

      // Fetch the PDF file
      const pdfResponse = await fetch(fullAttachmentUrl);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
      }
      const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
      const pdfBase64 = pdfBuffer.toString('base64');

      // Create email with attachment
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      // Build email body with signature
      let messageText = body ? body.replace(/\n/g, '<br>') : '';
      
      // Add signature if enabled
      if (user.useSignature) {
        // Read logo image and convert to base64 data URI
        const logoPath = path.join(process.cwd(), "attached_assets", "rs-logo.jpg");
        const logoBuffer = await fs.readFile(logoPath);
        const logoBase64 = logoBuffer.toString('base64');
        const logoDataUri = `data:image/jpeg;base64,${logoBase64}`;
        
        // Read signature template from file
        const templatePath = path.join(process.cwd(), "attached_assets", "signature-template.html");
        let signatureTemplate = await fs.readFile(templatePath, 'utf-8');
        
        // Replace placeholders
        signatureTemplate = signatureTemplate
          .replace(/{{USER_NAME}}/g, user.fullName || user.username)
          .replace(/{{LOGO_URL}}/g, logoDataUri);
        
        messageText += signatureTemplate;
      }
      
      // Wrap in proper HTML structure with email-friendly styles
      const htmlBody = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<div style="max-width: 800px;">
${messageText}
</div>
</body>
</html>`;
      
      // Base64 encode the HTML body
      const htmlBodyBase64 = Buffer.from(htmlBody).toString('base64');
      
      const boundary = '----=_Part_' + Date.now();
      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        htmlBodyBase64,
        '',
        `--${boundary}`,
        'Content-Type: application/pdf',
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${attachmentFilename}"`,
        '',
        pdfBase64,
        '',
        `--${boundary}--`
      ].join('\r\n');

      const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      res.json({ success: true, messageId: result.data.id });
    } catch (error) {
      console.error("Gmail send error:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Send email with multiple attachments (per-user Gmail OAuth)
  app.post("/api/gmail/send-with-attachments", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { to, cc, bcc, subject, body, attachmentUrls } = req.body;
      
      if (!to || !subject || !Array.isArray(attachmentUrls)) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if user has Gmail connected
      if (!user.gmailAccessToken || !user.gmailRefreshToken) {
        return res.status(401).json({ error: "Gmail not connected. Please connect your Gmail account in Settings." });
      }

      const { google } = await import("googleapis");
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET
      );

      // Set credentials with refresh token support
      oauth2Client.setCredentials({
        access_token: user.gmailAccessToken,
        refresh_token: user.gmailRefreshToken,
        expiry_date: user.gmailTokenExpiry ? new Date(user.gmailTokenExpiry).getTime() : undefined,
      });

      // Auto-refresh access token if expired
      oauth2Client.on('tokens', async (tokens) => {
        if (tokens.access_token) {
          await storage.updateUser(user.id, {
            gmailAccessToken: tokens.access_token,
            gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
          });
        }
      });

      // Build email body with signature
      let messageText = body ? body.replace(/\n/g, '<br>') : '';
      
      // Add signature if enabled
      if (user.useSignature) {
        // Read logo image and convert to base64 data URI
        const logoPath = path.join(process.cwd(), "attached_assets", "rs-logo.jpg");
        const logoBuffer = await fs.readFile(logoPath);
        const logoBase64 = logoBuffer.toString('base64');
        const logoDataUri = `data:image/jpeg;base64,${logoBase64}`;
        
        const templatePath = path.join(process.cwd(), "attached_assets", "signature-template.html");
        let signatureTemplate = await fs.readFile(templatePath, 'utf-8');
        
        signatureTemplate = signatureTemplate
          .replace(/{{USER_NAME}}/g, user.fullName || user.username)
          .replace(/{{LOGO_URL}}/g, logoDataUri);
        
        messageText += signatureTemplate;
      }
      
      const htmlBody = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<div style="max-width: 800px;">
${messageText}
</div>
</body>
</html>`;
      
      const htmlBodyBase64 = Buffer.from(htmlBody).toString('base64');
      const boundary = '----=_Part_' + Date.now();
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      const messageParts = [
        `To: ${to}`,
        ...(cc ? [`Cc: ${cc}`] : []),
        ...(bcc ? [`Bcc: ${bcc}`] : []),
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        htmlBodyBase64,
        ''
      ];

      // Process each attachment
      for (const attachmentUrl of attachmentUrls) {
        let fullAttachmentUrl = attachmentUrl;
        if (attachmentUrl.startsWith('/')) {
          const baseUrl = process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : process.env.REPL_SLUG 
              ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
              : 'http://localhost:5000';
          fullAttachmentUrl = `${baseUrl}${attachmentUrl}`;
        }

        const fileResponse = await fetch(fullAttachmentUrl);
        if (!fileResponse.ok) {
          console.error(`Failed to fetch file: ${fullAttachmentUrl}`);
          continue;
        }
        
        const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
        const fileBase64 = fileBuffer.toString('base64');
        const filename = attachmentUrl.split('/').pop() || 'attachment';
        
        let contentType = 'application/octet-stream';
        if (filename.toLowerCase().endsWith('.pdf')) {
          contentType = 'application/pdf';
        } else if (filename.toLowerCase().match(/\.(jpg|jpeg)$/)) {
          contentType = 'image/jpeg';
        } else if (filename.toLowerCase().endsWith('.png')) {
          contentType = 'image/png';
        }

        messageParts.push(
          `--${boundary}`,
          `Content-Type: ${contentType}`,
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${filename}"`,
          '',
          fileBase64,
          ''
        );
      }

      messageParts.push(`--${boundary}--`);
      const message = messageParts.join('\r\n');
      const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      res.json({ success: true, messageId: result.data.id });
    } catch (error) {
      console.error("Gmail send with attachments error:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}