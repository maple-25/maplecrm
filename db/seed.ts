import { db } from "./index";
import * as schema from "@shared/schema";
import { format, subDays } from "date-fns";

async function seed() {
  try {
    console.log("🌱 Starting database seed...");
    
    // Check if team members already exist to avoid duplicates
    const existingTeamMembers = await db.query.teamMembers.findMany();
    
    // Only seed team members if none exist
    if (existingTeamMembers.length === 0) {
      console.log("Seeding team members...");
      
      const teamMembersData = [
        {
          name: "Alex Morgan",
          email: "alex.morgan@example.com",
          role: "Investment Analyst",
          avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
        },
        {
          name: "Sarah Johnson",
          email: "sarah.johnson@example.com",
          role: "Senior Advisor",
          avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
        },
        {
          name: "Michael Chen",
          email: "michael.chen@example.com",
          role: "Investment Manager",
          avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
        },
        {
          name: "Priya Patel",
          email: "priya.patel@example.com",
          role: "Client Relations",
          avatarUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
        }
      ];
      
      await db.insert(schema.teamMembers).values(teamMembersData);
      console.log(`✅ Added ${teamMembersData.length} team members`);
      
      // Fetch the inserted team members to use their IDs
      const members = await db.query.teamMembers.findMany();
      
      // Now seed some clients
      console.log("Seeding clients...");
      
      const clientsData = [
        {
          name: "Meridian Holdings",
          status: "active",
          lastContacted: new Date(format(subDays(new Date(), 2), "yyyy-MM-dd"))
        },
        {
          name: "Global Ventures Inc.",
          status: "pending",
          lastContacted: new Date(format(subDays(new Date(), 7), "yyyy-MM-dd"))
        },
        {
          name: "Summit Capital Partners",
          status: "on-hold",
          lastContacted: new Date(format(subDays(new Date(), 11), "yyyy-MM-dd"))
        },
        {
          name: "Astro Investments Ltd.",
          status: "completed",
          lastContacted: new Date(format(subDays(new Date(), 3), "yyyy-MM-dd"))
        },
        {
          name: "Blue Sky Ventures",
          status: "active",
          lastContacted: new Date(format(subDays(new Date(), 1), "yyyy-MM-dd"))
        },
        {
          name: "Legacy Financial Group",
          status: "completed",
          lastContacted: new Date(format(subDays(new Date(), 30), "yyyy-MM-dd"))
        }
      ];
      
      const insertedClients = await db.insert(schema.clients).values(clientsData).returning();
      console.log(`✅ Added ${insertedClients.length} clients`);
      
      // Now seed projects
      console.log("Seeding projects...");
      
      // Helper function to find member by name
      const getMemberByName = (name: string) => {
        return members.find(m => m.name === name) || members[0];
      };
      
      // Helper function to find client by name
      const getClientByName = (name: string) => {
        return insertedClients.find(c => c.name === name);
      };
      
      // Direct projects
      const directProjects = [
        {
          name: "Meridian Holdings Investment Round",
          phoneNumber: "+91 98765 43210",
          poc: "Rajiv Mehta",
          type: "direct",
          lastContacted: getClientByName("Meridian Holdings")?.lastContacted,
          status: "active",
          assignedToId: getMemberByName("Alex Morgan").id,
          clientId: getClientByName("Meridian Holdings")?.id
        },
        {
          name: "Global Ventures Expansion",
          phoneNumber: "+1 212-555-0123",
          poc: "Sarah Johnson",
          type: "direct",
          lastContacted: getClientByName("Global Ventures Inc.")?.lastContacted,
          status: "pending",
          assignedToId: getMemberByName("Sarah Johnson").id,
          clientId: getClientByName("Global Ventures Inc.")?.id
        },
        {
          name: "Summit Capital Restructuring",
          phoneNumber: "+44 20 7946 0958",
          poc: "David Chen",
          type: "direct",
          lastContacted: getClientByName("Summit Capital Partners")?.lastContacted,
          status: "on-hold",
          assignedToId: getMemberByName("Michael Chen").id,
          clientId: getClientByName("Summit Capital Partners")?.id
        },
        {
          name: "Astro Investments Divestiture",
          phoneNumber: "+91 98123 45678",
          poc: "Priya Patel",
          type: "direct",
          lastContacted: getClientByName("Astro Investments Ltd.")?.lastContacted,
          status: "completed",
          assignedToId: getMemberByName("Priya Patel").id,
          clientId: getClientByName("Astro Investments Ltd.")?.id
        }
      ];
      
      // Affiliate projects
      const affiliateProjects = [
        {
          name: "Tech Startup Funding",
          phoneNumber: "+91 99876 54321",
          poc: "Vikram Shah",
          type: "affiliate",
          affiliatePartner: "kotak",
          lastContacted: new Date(format(subDays(new Date(), 5), "yyyy-MM-dd")),
          status: "active",
          assignedToId: getMemberByName("Alex Morgan").id
        },
        {
          name: "Healthcare Portfolio Review",
          phoneNumber: "+91 88765 43210",
          poc: "Ananya Desai",
          type: "affiliate",
          affiliatePartner: "kotak",
          lastContacted: new Date(format(subDays(new Date(), 8), "yyyy-MM-dd")),
          status: "pending",
          assignedToId: getMemberByName("Sarah Johnson").id
        },
        {
          name: "Sustainable Energy Fund",
          phoneNumber: "+65 9876 5432",
          poc: "Lim Wei",
          type: "affiliate",
          affiliatePartner: "360-wealth",
          lastContacted: new Date(format(subDays(new Date(), 3), "yyyy-MM-dd")),
          status: "active",
          assignedToId: getMemberByName("Michael Chen").id
        },
        {
          name: "Real Estate Trust",
          phoneNumber: "+41 78 123 4567",
          poc: "Hans Müller",
          type: "affiliate",
          affiliatePartner: "lgt",
          lastContacted: new Date(format(subDays(new Date(), 15), "yyyy-MM-dd")),
          status: "on-hold",
          assignedToId: getMemberByName("Priya Patel").id
        },
        {
          name: "Emerging Markets Fund",
          phoneNumber: "+1 415-555-0123",
          poc: "Jennifer Lee",
          type: "affiliate",
          affiliatePartner: "pandion",
          lastContacted: new Date(format(subDays(new Date(), 6), "yyyy-MM-dd")),
          status: "active",
          assignedToId: getMemberByName("Alex Morgan").id
        }
      ];
      
      // Other projects
      const otherProjects = [
        {
          name: "SME Finance Symposium",
          phoneNumber: "+91 99887 76655",
          poc: "Rahul Sharma",
          type: "other",
          category: "phdcci",
          lastContacted: new Date(format(subDays(new Date(), 4), "yyyy-MM-dd")),
          status: "active",
          assignedToId: getMemberByName("Sarah Johnson").id
        },
        {
          name: "Financial Inclusion Initiative",
          phoneNumber: "+91 98765 12345",
          poc: "Neha Gupta",
          type: "other",
          category: "idc",
          lastContacted: new Date(format(subDays(new Date(), 9), "yyyy-MM-dd")),
          status: "pending",
          assignedToId: getMemberByName("Michael Chen").id
        },
        {
          name: "Investment Banking Campaign",
          phoneNumber: "+1 650-555-0123",
          poc: "Mark Williams",
          type: "other",
          category: "marketing",
          lastContacted: new Date(format(subDays(new Date(), 2), "yyyy-MM-dd")),
          status: "active",
          assignedToId: getMemberByName("Priya Patel").id
        },
        {
          name: "Financial Leadership Series",
          phoneNumber: "+44 20 7123 4567",
          poc: "Emma Clarke",
          type: "other",
          category: "pr",
          lastContacted: new Date(format(subDays(new Date(), 7), "yyyy-MM-dd")),
          status: "active",
          assignedToId: getMemberByName("Alex Morgan").id
        }
      ];
      
      const allProjects = [...directProjects, ...affiliateProjects, ...otherProjects];
      await db.insert(schema.projects).values(allProjects);
      console.log(`✅ Added ${allProjects.length} projects`);
      
      console.log("🌱 Seed completed successfully!");
    } else {
      console.log("Database already contains team members, skipping seed.");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
