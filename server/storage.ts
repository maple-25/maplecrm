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
  let query = db.select().from(projects)
    .leftJoin(teamMembers, eq(projects.assignedToId, teamMembers.id))
    .orderBy(desc(projects.updatedAt));

  // Apply filters
  if (filters.status && filters.status !== 'all') {
    query = query.where(eq(projects.status, filters.status));
  }

  if (filters.assignedToId && filters.assignedToId !== 'all') {
    query = query.where(eq(projects.assignedToId, parseInt(filters.assignedToId)));
  }

  if (filters.type && filters.type !== 'all') {
    query = query.where(eq(projects.type, filters.type));
  }

  if (filters.lastContacted && filters.lastContacted !== 'all') {
    const today = new Date();
    let dateFilter;

    switch (filters.lastContacted) {
      case 'today':
        dateFilter = format(today, 'yyyy-MM-dd');
        query = query.where(gte(projects.lastContacted, new Date(dateFilter)));
        break;
      case 'week':
        dateFilter = startOfWeek(today);
        query = query.where(gte(projects.lastContacted, dateFilter));
        break;
      case 'month':
        dateFilter = startOfMonth(today);
        query = query.where(gte(projects.lastContacted, dateFilter));
        break;
      case 'quarter':
        dateFilter = startOfQuarter(today);
        query = query.where(gte(projects.lastContacted, dateFilter));
        break;
    }
  }

  const result = await query;

  // Transform the result to match the expected structure
  return result.map(row => ({
    id: row.projects.id,
    name: row.projects.name,
    phoneNumber: row.projects.phoneNumber,
    poc: row.projects.poc,
    type: row.projects.type,
    affiliatePartner: row.projects.affiliatePartner,
    category: row.projects.category,
    lastContacted: row.projects.lastContacted,
    status: row.projects.status,
    assignedToId: row.projects.assignedToId,
    clientId: row.projects.clientId,
    createdAt: row.projects.createdAt,
    updatedAt: row.projects.updatedAt,
    assignedTo: row.team_members ? {
      id: row.team_members.id,
      name: row.team_members.name,
      avatarUrl: row.team_members.avatarUrl
    } : null
  }));
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
    // Pre-process date fields
    const processedData = {
      ...data,
      // Convert ISO string dates to Date objects or null
      lastContacted: data.lastContacted ? new Date(data.lastContacted) : null
    };
    
    // Validate data
    const validatedData = projectInsertSchema.parse(processedData);
    
    // Handle client association: if it's a new direct project with no client, we might want to create one
    if (data.type === 'direct' && !data.clientId && data.name) {
      const [newClient] = await db.insert(clients).values({
        name: data.name,
        status: data.status,
        lastContacted: processedData.lastContacted
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
  // Get current project to check for changes
  const currentProject = await db.query.projects.findFirst({
    where: eq(projects.id, id)
  });

  if (!currentProject) {
    throw new Error(`Project with ID ${id} not found`);
  }

  // Update the project
  const [updatedProject] = await db.update(projects)
    .set(data)
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
}

async function deleteProject(id: number) {
  await db.delete(projects).where(eq(projects.id, id));
}

// Clients
async function getClients(status?: string) {
  let query = db.select().from(clients);
  
  if (status) {
    query = query.where(eq(clients.status, status));
  }
  
  // Get document counts for each client
  const result = await query.orderBy(desc(clients.updatedAt));
  
  // Add document count to each client
  const clientsWithDocs = await Promise.all(result.map(async (client) => {
    const docCount = await db.select({ count: count() }).from(documents)
      .where(eq(documents.clientId, client.id));
    
    return {
      ...client,
      documentCount: docCount[0].count || 0
    };
  }));
  
  return clientsWithDocs;
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
  const validatedData = clientInsertSchema.parse(data);
  const [newClient] = await db.insert(clients).values(validatedData).returning();
  return newClient;
}

async function updateClient(id: number, data: any) {
  const [updatedClient] = await db.update(clients)
    .set(data)
    .where(eq(clients.id, id))
    .returning();
  
  return updatedClient;
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
