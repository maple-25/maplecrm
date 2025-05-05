import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Team members table
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phoneNumber: text("phone_number"),
  poc: text("poc"),
  type: text("type").notNull().default("direct"), // direct, affiliate, other
  affiliatePartner: text("affiliate_partner"), // kotak, 360-wealth, lgt, pandion
  category: text("category"), // phdcci, idc, marketing, pr
  lastContacted: timestamp("last_contacted"),
  status: text("status").notNull().default("active"), // active, pending, completed, on-hold
  activeStage: text("active_stage"), // NDA, IM/Financial Model, EL, Term Sheet, Due Diligence, Agreement, Investor Tracker
  hasInvoice: text("has_invoice").default("no"),
  assignedToId: integer("assigned_to_id").references(() => teamMembers.id).notNull(),
  clientId: integer("client_id").references(() => clients.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"), // active, pending, completed, on-hold
  lastContacted: timestamp("last_contacted"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type"),
  size: integer("size"),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define relations
export const projectsRelations = relations(projects, ({ one }) => ({
  assignedTo: one(teamMembers, {
    fields: [projects.assignedToId],
    references: [teamMembers.id],
  }),
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  client: one(clients, {
    fields: [documents.clientId],
    references: [clients.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ many }) => ({
  projects: many(projects),
}));

// Create schemas for validation
export const teamMemberInsertSchema = createInsertSchema(teamMembers, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  email: (schema) => schema.email("Must be a valid email"),
  role: (schema) => schema.min(2, "Role must be at least 2 characters"),
});
export type TeamMemberInsert = z.infer<typeof teamMemberInsertSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

export const projectInsertSchema = createInsertSchema(projects, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  phoneNumber: (schema) => schema.optional(),
  poc: (schema) => schema.optional(),
  type: (schema) => schema.min(1, "Type is required"),
  status: (schema) => schema.min(1, "Status is required"),
  hasInvoice: (schema) => z.enum(["yes", "no"]).default("no"),
});
export type ProjectInsert = z.infer<typeof projectInsertSchema>;
export type Project = typeof projects.$inferSelect;

export const clientInsertSchema = createInsertSchema(clients, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  status: (schema) => schema.min(1, "Status is required"),
});
export type ClientInsert = z.infer<typeof clientInsertSchema>;
export type Client = typeof clients.$inferSelect;

export const documentInsertSchema = createInsertSchema(documents, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  filePath: (schema) => schema.min(1, "File path is required"),
  clientId: (schema) => schema.positive("Client ID is required"),
});
export type DocumentInsert = z.infer<typeof documentInsertSchema>;
export type Document = typeof documents.$inferSelect;

// Our existing user authentication schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
