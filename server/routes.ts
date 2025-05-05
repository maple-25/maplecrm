import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import * as path from "path";
import * as fs from "fs";
import multer from "multer";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { ZodError } from "zod";

// Create uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const clientId = req.params.clientId;
      const clientDir = path.join(uploadDir, clientId);
      if (!fs.existsSync(clientDir)) {
        fs.mkdirSync(clientDir, { recursive: true });
      }
      cb(null, clientDir);
    },
    filename: (req, file, cb) => {
      // Create a unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  const apiPrefix = "/api";
  
  // Error handler for validation errors
  const handleValidationError = (err: any, res: any) => {
    if (err instanceof ZodError) {
      const readableError = fromZodError(err);
      return res.status(400).json({ message: readableError.message });
    }
    console.error("API Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  };

  // Team Members API
  app.get(`${apiPrefix}/team-members`, async (req, res) => {
    try {
      const teamMembers = await storage.getTeamMembers();
      return res.json(teamMembers);
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  // Projects API
  app.get(`${apiPrefix}/projects`, async (req, res) => {
    try {
      const { status, assignedTo, type, lastContacted } = req.query;
      const projects = await storage.getProjects({ 
        status: status as string, 
        assignedToId: assignedTo as string, 
        type: type as string, 
        lastContacted: lastContacted as string 
      });
      return res.json(projects);
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  app.get(`${apiPrefix}/projects/affiliate/:partner`, async (req, res) => {
    try {
      const { partner } = req.params;
      const projects = await storage.getProjectsByAffiliatePartner(partner);
      return res.json(projects);
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  app.get(`${apiPrefix}/projects/other/:category`, async (req, res) => {
    try {
      const { category } = req.params;
      const projects = await storage.getProjectsByCategory(category);
      return res.json(projects);
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  app.post(`${apiPrefix}/projects`, async (req, res) => {
    try {
      // Process the data for proper type handling
      const data = { ...req.body };
      
      // Handle lastContacted conversion if provided
      if (data.lastContacted) {
        try {
          if (typeof data.lastContacted === 'string') {
            // Try to create a valid date object from the string
            const dateObj = new Date(data.lastContacted);
            if (!isNaN(dateObj.getTime())) {
              data.lastContacted = dateObj;
            } else {
              // If date is invalid, set to null
              console.log("Invalid date received:", data.lastContacted);
              data.lastContacted = null;
            }
          }
        } catch (dateErr) {
          console.error("Error parsing date:", dateErr);
          data.lastContacted = null;
        }
      }
      
      // Handle hasInvoice as string (yes/no)
      if (data.hasInvoice !== undefined) {
        // Convert any boolean or truthy values to string yes/no format
        if (typeof data.hasInvoice === 'boolean') {
          data.hasInvoice = data.hasInvoice ? "yes" : "no";
        } else if (typeof data.hasInvoice === 'number') {
          data.hasInvoice = data.hasInvoice > 0 ? "yes" : "no";
        } else if (typeof data.hasInvoice === 'string') {
          if (data.hasInvoice.toLowerCase() === 'true') {
            data.hasInvoice = "yes";
          } else if (data.hasInvoice.toLowerCase() === 'false') {
            data.hasInvoice = "no";
          }
          // If it's already "yes" or "no", it will remain unchanged
        }
      }
      
      console.log("Creating project with processed data:", data);
      const project = await storage.createProject(data);
      return res.status(201).json(project);
    } catch (err) {
      console.error("Error creating project:", err);
      handleValidationError(err, res);
    }
  });

  app.patch(`${apiPrefix}/projects/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Process the data for proper type handling
      const data = { ...req.body };
      
      // Handle lastContacted conversion if provided
      if (data.lastContacted) {
        try {
          if (typeof data.lastContacted === 'string') {
            // Try to create a valid date object from the string
            const dateObj = new Date(data.lastContacted);
            if (!isNaN(dateObj.getTime())) {
              data.lastContacted = dateObj;
            } else {
              // If date is invalid, set to null
              console.log("Invalid date received:", data.lastContacted);
              data.lastContacted = null;
            }
          }
        } catch (dateErr) {
          console.error("Error parsing date:", dateErr);
          data.lastContacted = null;
        }
      }
      
      // Handle hasInvoice as string (yes/no)
      if (data.hasInvoice !== undefined) {
        // Convert any boolean or truthy values to string yes/no format
        if (typeof data.hasInvoice === 'boolean') {
          data.hasInvoice = data.hasInvoice ? "yes" : "no";
        } else if (typeof data.hasInvoice === 'number') {
          data.hasInvoice = data.hasInvoice > 0 ? "yes" : "no";
        } else if (typeof data.hasInvoice === 'string') {
          if (data.hasInvoice.toLowerCase() === 'true') {
            data.hasInvoice = "yes";
          } else if (data.hasInvoice.toLowerCase() === 'false') {
            data.hasInvoice = "no";
          }
          // If it's already "yes" or "no", it will remain unchanged
        }
      }
      
      console.log(`Updating project ${id} with processed data:`, data);
      const project = await storage.updateProject(parseInt(id), data);
      return res.json(project);
    } catch (err) {
      console.error("Error updating project:", err);
      handleValidationError(err, res);
    }
  });

  app.delete(`${apiPrefix}/projects/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteProject(parseInt(id));
      return res.status(204).send();
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  // Clients API
  app.get(`${apiPrefix}/clients`, async (req, res) => {
    try {
      const { status } = req.query;
      const clients = await storage.getClients(status as string);
      return res.json(clients);
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  app.get(`${apiPrefix}/clients/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      const client = await storage.getClientById(parseInt(id));
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      return res.json(client);
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  app.post(`${apiPrefix}/clients`, async (req, res) => {
    try {
      console.log("Creating client with data:", req.body);
      const client = await storage.createClient(req.body);
      console.log("Client created:", client);
      return res.status(201).json(client);
    } catch (err) {
      console.error("Error creating client:", err);
      handleValidationError(err, res);
    }
  });

  app.patch(`${apiPrefix}/clients/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      const client = await storage.updateClient(parseInt(id), req.body);
      return res.json(client);
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  app.delete(`${apiPrefix}/clients/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteClient(parseInt(id));
      return res.status(204).send();
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  // Client Projects API
  app.get(`${apiPrefix}/clients/:id/projects`, async (req, res) => {
    try {
      const { id } = req.params;
      const projects = await storage.getProjectsByClientId(parseInt(id));
      return res.json(projects);
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  // Documents API
  app.get(`${apiPrefix}/clients/:clientId/documents`, async (req, res) => {
    try {
      const { clientId } = req.params;
      const documents = await storage.getDocumentsByClientId(parseInt(clientId));
      return res.json(documents);
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  app.post(`${apiPrefix}/clients/:clientId/documents`, upload.single('file'), async (req, res) => {
    try {
      const { clientId } = req.params;
      const file = req.file;
      
      console.log("Document upload request:", {
        params: req.params,
        body: req.body,
        file: req.file ? "File exists" : "No file"
      });
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const document = {
        name: req.body.name || file.originalname,
        filePath: file.path,
        mimeType: file.mimetype,
        size: file.size,
        clientId: parseInt(clientId)
      };

      console.log("Creating document with data:", document);
      const savedDocument = await storage.createDocument(document);
      return res.status(201).json(savedDocument);
    } catch (err) {
      console.error("Error in document upload:", err);
      handleValidationError(err, res);
    }
  });

  app.get(`${apiPrefix}/clients/:clientId/documents/:documentId/download`, async (req, res) => {
    try {
      const { clientId, documentId } = req.params;
      const document = await storage.getDocumentById(parseInt(documentId));
      
      if (!document || document.clientId !== parseInt(clientId)) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.download(document.filePath, document.name);
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  app.delete(`${apiPrefix}/clients/:clientId/documents/:documentId`, async (req, res) => {
    try {
      const { documentId } = req.params;
      await storage.deleteDocument(parseInt(documentId));
      return res.status(204).send();
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  // Statistics API
  app.get(`${apiPrefix}/stats/projects`, async (req, res) => {
    try {
      const stats = await storage.getProjectStats();
      return res.json(stats);
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  app.get(`${apiPrefix}/stats/clients`, async (req, res) => {
    try {
      const stats = await storage.getClientStats();
      return res.json(stats);
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}