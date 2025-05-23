import { db } from "@db";
import { 
  teamMembers, 
  projects, 
  clients, 
  documents, 
  projectInsertSchema, 
  clientInsertSchema, 
  documentInsertSchema
} from "@shared/schema";
import { eq, and, or, lt, gte, like, desc, asc, sql, count } from "drizzle-orm";
import { format, subDays, startOfWeek, startOfMonth, startOfQuarter } from "date-fns";
import * as fs from "fs";
import * as path from "path";

// Team members
async function getTeamMembers() {
  return await db.query.teamMembers.findMany({
    orderBy: asc(teamMembers.name)
  });
}

// Projects
interface ProjectFilterOptions {
  status?: string;
  assignedToId?: string;
  type?: string;
  lastContacted?: string;
}

async function getProjects(filters: ProjectFilterOptions = {}) {
  try {
    console.log("Getting projects with filters:", filters);
    
    let query = db.query.projects.findMany({
      with: {
        assignedTo: true
      },
      orderBy: [desc(projects.updatedAt)]
    });
    
    // We will apply filters manually after retrieving data
    const results = await query;
    console.log(`Retrieved ${results.length} projects`);
    
    // Apply filters in-memory
    let filteredResults = [...results];
    
    if (filters.status && filters.status !== 'all') {
      filteredResults = filteredResults.filter(p => p.status === filters.status);
    }
    
    if (filters.assignedToId && filters.assignedToId !== 'all') {
      const assignedId = parseInt(filters.assignedToId);
      filteredResults = filteredResults.filter(p => p.assignedToId === assignedId);
    }
    
    if (filters.type && filters.type !== 'all') {
      filteredResults = filteredResults.filter(p => p.type === filters.type);
    }
    
    if (filters.lastContacted && filters.lastContacted !== 'all') {
      const today = new Date();
      let dateFilter;

      switch (filters.lastContacted) {
        case 'today':
          dateFilter = format(today, 'yyyy-MM-dd');
          filteredResults = filteredResults.filter(p => 
            p.lastContacted && new Date(p.lastContacted) >= new Date(dateFilter)
          );
          break;
        case 'week':
          dateFilter = startOfWeek(today);
          filteredResults = filteredResults.filter(p => 
            p.lastContacted && new Date(p.lastContacted) >= dateFilter
          );
          break;
        case 'month':
          dateFilter = startOfMonth(today);
          filteredResults = filteredResults.filter(p => 
            p.lastContacted && new Date(p.lastContacted) >= dateFilter
          );
          break;
        case 'quarter':
          dateFilter = startOfQuarter(today);
          filteredResults = filteredResults.filter(p => 
            p.lastContacted && new Date(p.lastContacted) >= dateFilter
          );
          break;
      }
    }
    
    console.log(`After filtering: ${filteredResults.length} projects`);
    return filteredResults;
  } catch (error) {
    console.error("Error fetching projects:", error);
    throw error;
  }
}

async function getProjectsByAffiliatePartner(partner: string) {
  return await db.query.projects.findMany({
    where: and(
      eq(projects.type, 'affiliate'),
      eq(projects.affiliatePartner, partner)
    ),
    with: {
      assignedTo: true
    },
    orderBy: desc(projects.updatedAt)
  });
}

async function getProjectsByCategory(category: string) {
  return await db.query.projects.findMany({
    where: and(
      eq(projects.type, 'other'),
      eq(projects.category, category)
    ),
    with: {
      assignedTo: true
    },
    orderBy: desc(projects.updatedAt)
  });
}

async function getProjectsByClientId(clientId: number) {
  return await db.query.projects.findMany({
    where: eq(projects.clientId, clientId),
    with: {
      assignedTo: true
    },
    orderBy: desc(projects.updatedAt)
  });
}

async function createProject(data: any) {
  try {
    // Create a clean data object with only the fields we want to insert
    const insertData: Record<string, any> = {
      name: data.name || '',
      phoneNumber: data.phoneNumber || '',
      poc: data.poc || '',
      type: data.type || 'direct',
      status: data.status || 'active',
      assignedToId: typeof data.assignedToId === 'string' 
        ? parseInt(data.assignedToId) 
        : (data.assignedToId || 1) // Default to first team member if not specified
    };
    
    // Optional fields
    if (data.affiliatePartner) insertData.affiliatePartner = data.affiliatePartner;
    if (data.category) insertData.category = data.category;
    if (data.activeStage) insertData.activeStage = data.activeStage;
    
    // Handle date properly
    if (data.lastContacted) {
      if (typeof data.lastContacted === 'string') {
        insertData.lastContacted = new Date(data.lastContacted);
      } else if (data.lastContacted instanceof Date) {
        insertData.lastContacted = data.lastContacted;
      }
    } else {
      insertData.lastContacted = null;
    }
    
    // Handle hasInvoice as string (yes/no)
    if (data.hasInvoice !== undefined) {
      // Convert any boolean or truthy values to string yes/no format
      if (typeof data.hasInvoice === 'boolean') {
        insertData.hasInvoice = data.hasInvoice ? "yes" : "no";
      } else if (typeof data.hasInvoice === 'number') {
        insertData.hasInvoice = data.hasInvoice > 0 ? "yes" : "no";
      } else if (typeof data.hasInvoice === 'string') {
        if (data.hasInvoice.toLowerCase() === 'true') {
          insertData.hasInvoice = "yes";
        } else if (data.hasInvoice.toLowerCase() === 'false') {
          insertData.hasInvoice = "no";
        } else {
          // If it's already "yes" or "no", use it directly
          insertData.hasInvoice = data.hasInvoice;
        }
      } else {
        // Default to "no" if undefined or null
        insertData.hasInvoice = "no";
      }
    } else {
      insertData.hasInvoice = "no";
    }
    
    // Set timestamps
    insertData.createdAt = new Date();
    insertData.updatedAt = new Date();
    
    console.log("Creating project with clean data:", insertData);
    
    // Validate data
    const validatedData = projectInsertSchema.parse(insertData);
    
    // Handle client association: if it's a new direct project with no client, we might want to create one
    if (data.type === 'direct' && !data.clientId && data.name) {
      const [newClient] = await db.insert(clients).values({
        name: data.name,
        status: data.status || 'active',
        lastContacted: insertData.lastContacted || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      validatedData.clientId = newClient.id;
    }

    // Insert project and return it
    const [newProject] = await db.insert(projects).values(validatedData).returning();
  
    // If this project is associated with a client, update the client's last contacted date
    if (newProject.clientId && newProject.lastContacted) {
      await updateClientLastContacted(newProject.clientId, newProject.lastContacted);
    }
    
    return newProject;
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }
}

async function updateProject(id: number, data: any) {
  try {
    // Get current project to check for changes
    const currentProject = await db.query.projects.findFirst({
      where: eq(projects.id, id)
    });

    if (!currentProject) {
      throw new Error(`Project with ID ${id} not found`);
    }
    
    // Create a clean data object with only the fields we want to update
    const updateData: Record<string, any> = {};
    
    // Handle string fields
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
    if (data.poc !== undefined) updateData.poc = data.poc;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.affiliatePartner !== undefined) updateData.affiliatePartner = data.affiliatePartner;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.activeStage !== undefined) updateData.activeStage = data.activeStage;
    
    // Handle date conversion properly
    if (data.lastContacted !== undefined) {
      if (data.lastContacted === null) {
        updateData.lastContacted = null;
      } else if (typeof data.lastContacted === 'string') {
        updateData.lastContacted = new Date(data.lastContacted);
      } else if (data.lastContacted instanceof Date) {
        updateData.lastContacted = data.lastContacted;
      }
    }
    
    // Handle hasInvoice as string (yes/no)
    if (data.hasInvoice !== undefined) {
      // Convert any boolean or truthy values to string yes/no format
      if (typeof data.hasInvoice === 'boolean') {
        updateData.hasInvoice = data.hasInvoice ? "yes" : "no";
      } else if (typeof data.hasInvoice === 'number') {
        updateData.hasInvoice = data.hasInvoice > 0 ? "yes" : "no";
      } else if (typeof data.hasInvoice === 'string') {
        if (data.hasInvoice.toLowerCase() === 'true') {
          updateData.hasInvoice = "yes";
        } else if (data.hasInvoice.toLowerCase() === 'false') {
          updateData.hasInvoice = "no";
        } else {
          // If it's already "yes" or "no", use it directly
          updateData.hasInvoice = data.hasInvoice;
        }
      } else {
        // Default to "no" if undefined or null
        updateData.hasInvoice = "no";
      }
    }
    
    // Handle numeric conversion
    if (data.assignedToId !== undefined) {
      updateData.assignedToId = typeof data.assignedToId === 'string' 
        ? parseInt(data.assignedToId) 
        : data.assignedToId;
    }
    
    // Set the updated timestamp
    updateData.updatedAt = new Date();
    
    console.log("Clean update data:", updateData);
    
    // Update the project
    const [updatedProject] = await db.update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning();

    // If the project is associated with a client and the last contacted date changed, update the client
    if (
      updatedProject.clientId && 
      updatedProject.lastContacted && 
      (!currentProject.lastContacted || 
      new Date(updatedProject.lastContacted).getTime() !== new Date(currentProject.lastContacted).getTime())
    ) {
      await updateClientLastContacted(updatedProject.clientId, updatedProject.lastContacted);
    }

    // If the status changed, update the client status as well
    if (updatedProject.clientId && updatedProject.status !== currentProject.status) {
      await updateClientStatus(updatedProject.clientId, updatedProject.status);
    }

    return updatedProject;
  } catch (error) {
    console.error("Error updating project:", error);
    throw error;
  }
}

async function deleteProject(id: number) {
  await db.delete(projects).where(eq(projects.id, id));
}

// Clients
async function getClients(status?: string) {
  try {
    console.log("Getting clients with status filter:", status);
    
    // Get all clients
    const result = await db.query.clients.findMany({
      orderBy: [desc(clients.updatedAt)]
    });
    
    console.log(`Retrieved ${result.length} clients before filtering`);
    
    // Apply status filter if provided
    let filteredResults = result;
    if (status && status !== 'all') {
      filteredResults = result.filter(client => client.status === status);
      console.log(`After status filtering: ${filteredResults.length} clients`);
    }
    
    // Add document count to each client
    const clientsWithDocs = await Promise.all(filteredResults.map(async (client) => {
      const docCount = await db.select({ count: count() }).from(documents)
        .where(eq(documents.clientId, client.id));
      
      return {
        ...client,
        documentCount: docCount[0].count || 0
      };
    }));
    
    console.log(`Returning ${clientsWithDocs.length} clients with document counts`);
    return clientsWithDocs;
  } catch (error) {
    console.error("Error fetching clients:", error);
    throw error;
  }
}

async function getClientById(id: number) {
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, id)
  });
  
  if (!client) {
    return null;
  }
  
  // Get document count
  const docCount = await db.select({ count: count() }).from(documents)
    .where(eq(documents.clientId, id));
  
  return {
    ...client,
    documentCount: docCount[0].count || 0
  };
}

async function createClient(data: any) {
  try {
    console.log("Creating client with data:", data);
    
    // Create a clean data object for validation
    const insertData: Record<string, any> = {
      name: data.name || '',
      status: data.status || 'active',
    };
    
    // Handle date properly
    if (data.lastContacted) {
      if (typeof data.lastContacted === 'string') {
        insertData.lastContacted = new Date(data.lastContacted);
      } else if (data.lastContacted instanceof Date) {
        insertData.lastContacted = data.lastContacted;
      }
    } else {
      insertData.lastContacted = null;
    }
    
    // Set timestamps
    insertData.createdAt = new Date();
    insertData.updatedAt = new Date();
    
    console.log("Clean client data for insertion:", insertData);
    
    // Validate and insert
    const validatedData = clientInsertSchema.parse(insertData);
    const [newClient] = await db.insert(clients).values(validatedData).returning();
    
    console.log("Client created successfully:", newClient);
    return newClient;
  } catch (error) {
    console.error("Error creating client:", error);
    throw error;
  }
}

async function updateClient(id: number, data: any) {
  try {
    console.log(`Updating client ${id} with data:`, data);
    
    // Create a clean data object with only the fields we want to update
    const updateData: Record<string, any> = {};
    
    // Handle string fields
    if (data.name !== undefined) updateData.name = data.name;
    if (data.status !== undefined) updateData.status = data.status;
    
    // Handle date conversion properly
    if (data.lastContacted !== undefined) {
      if (data.lastContacted === null) {
        updateData.lastContacted = null;
      } else if (typeof data.lastContacted === 'string') {
        updateData.lastContacted = new Date(data.lastContacted);
      } else if (data.lastContacted instanceof Date) {
        updateData.lastContacted = data.lastContacted;
      }
    }
    
    // Set the updated timestamp
    updateData.updatedAt = new Date();
    
    console.log("Clean client update data:", updateData);
    
    // Update the client
    const [updatedClient] = await db.update(clients)
      .set(updateData)
      .where(eq(clients.id, id))
      .returning();
    
    console.log("Client updated successfully:", updatedClient);
    return updatedClient;
  } catch (error) {
    console.error(`Error updating client ${id}:`, error);
    throw error;
  }
}

async function deleteClient(id: number) {
  // First, delete all related documents
  const clientDocs = await db.select().from(documents).where(eq(documents.clientId, id));
  
  // Delete the physical files
  for (const doc of clientDocs) {
    try {
      if (fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }
    } catch (err) {
      console.error(`Failed to delete file ${doc.filePath}:`, err);
    }
  }
  
  // Delete the document records
  if (clientDocs.length > 0) {
    await db.delete(documents).where(eq(documents.clientId, id));
  }
  
  // Delete associated projects
  await db.delete(projects).where(eq(projects.clientId, id));
  
  // Finally delete the client
  await db.delete(clients).where(eq(clients.id, id));
}

// Helper functions for client updates based on project changes
async function updateClientLastContacted(clientId: number, lastContacted: Date) {
  // Get the current client
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId)
  });
  
  if (!client) return;
  
  // Only update if the new date is more recent
  if (!client.lastContacted || new Date(lastContacted) > new Date(client.lastContacted)) {
    await db.update(clients)
      .set({ lastContacted, updatedAt: new Date() })
      .where(eq(clients.id, clientId));
  }
}

async function updateClientStatus(clientId: number, status: string) {
  await db.update(clients)
    .set({ status, updatedAt: new Date() })
    .where(eq(clients.id, clientId));
}

// Documents
async function getDocumentsByClientId(clientId: number) {
  return await db.query.documents.findMany({
    where: eq(documents.clientId, clientId),
    orderBy: desc(documents.createdAt)
  });
}

async function getDocumentById(id: number) {
  return await db.query.documents.findFirst({
    where: eq(documents.id, id)
  });
}

async function createDocument(data: any) {
  const validatedData = documentInsertSchema.parse(data);
  const [newDocument] = await db.insert(documents).values(validatedData).returning();
  return newDocument;
}

async function deleteDocument(id: number) {
  // Get document info first
  const document = await db.query.documents.findFirst({
    where: eq(documents.id, id)
  });
  
  if (document && document.filePath) {
    try {
      // Delete physical file
      if (fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
      }
    } catch (err) {
      console.error(`Failed to delete file ${document.filePath}:`, err);
    }
  }
  
  // Delete document record
  await db.delete(documents).where(eq(documents.id, id));
}

// Statistics
async function getProjectStats() {
  // Get total projects count
  const totalProjectsResult = await db.select({ count: count() }).from(projects);
  const totalProjects = totalProjectsResult[0].count || 0;
  
  // Get projects created this month
  const startOfThisMonth = startOfMonth(new Date());
  const newProjectsThisMonthResult = await db.select({ count: count() })
    .from(projects)
    .where(gte(projects.createdAt, startOfThisMonth));
  const newProjectsThisMonth = newProjectsThisMonthResult[0].count || 0;
  
  // Get status counts
  const statusCounts = {
    active: 0,
    pending: 0,
    completed: 0,
    'on-hold': 0
  };
  
  const statusResults = await db.select({
    status: projects.status,
    count: count()
  })
  .from(projects)
  .groupBy(projects.status);
  
  statusResults.forEach(result => {
    if (result.status in statusCounts) {
      statusCounts[result.status as keyof typeof statusCounts] = result.count;
    }
  });
  
  // Calculate completion rate
  const completionRate = totalProjects > 0 
    ? Math.round((statusCounts.completed / totalProjects) * 100) 
    : 0;
  
  // Count pending followups (projects that haven't been contacted in the last week)
  const oneWeekAgo = subDays(new Date(), 7);
  const pendingFollowupsResult = await db.select({ count: count() })
    .from(projects)
    .where(
      and(
        eq(projects.status, 'active'),
        or(
          lt(projects.lastContacted, oneWeekAgo),
          sql`${projects.lastContacted} IS NULL`
        )
      )
    );
  const pendingFollowups = pendingFollowupsResult[0].count || 0;
  
  // Get recent activities (latest 5 updated projects)
  const recentProjectUpdates = await db.select({
    id: projects.id,
    name: projects.name,
    status: projects.status,
    updatedAt: projects.updatedAt
  })
  .from(projects)
  .orderBy(desc(projects.updatedAt))
  .limit(5);
  
  const recentActivities = recentProjectUpdates.map(project => ({
    description: `Project "${project.name}" was updated to ${project.status}`,
    timestamp: format(new Date(project.updatedAt), 'MMM dd, yyyy HH:mm')
  }));
  
  return {
    totalProjects,
    newProjectsThisMonth,
    statusCounts,
    completionRate,
    pendingFollowups,
    recentActivities
  };
}

async function getClientStats() {
  // Get total clients
  const totalClientsResult = await db.select({ count: count() }).from(clients);
  const totalClients = totalClientsResult[0].count || 0;
  
  // Get active clients
  const activeClientsResult = await db.select({ count: count() })
    .from(clients)
    .where(eq(clients.status, 'active'));
  const activeClients = activeClientsResult[0].count || 0;
  
  return {
    totalClients,
    activeClients
  };
}

export const storage = {
  // Team members
  getTeamMembers,
  
  // Projects
  getProjects,
  getProjectsByAffiliatePartner,
  getProjectsByCategory,
  getProjectsByClientId,
  createProject,
  updateProject,
  deleteProject,
  
  // Clients
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  
  // Documents
  getDocumentsByClientId,
  getDocumentById,
  createDocument,
  deleteDocument,
  
  // Statistics
  getProjectStats,
  getClientStats
};
