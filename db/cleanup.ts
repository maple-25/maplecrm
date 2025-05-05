import { db } from "./index";
import { clients, documents, projects, teamMembers } from "../shared/schema";

async function cleanupDatabase() {
  console.log("Cleaning up database...");
  
  try {
    console.log("Deleting all documents...");
    await db.delete(documents);
    
    console.log("Deleting all projects...");
    await db.delete(projects);
    
    console.log("Deleting all clients...");
    await db.delete(clients);
    
    // We're keeping team members as they're not user data but system configuration
    console.log("Database cleanup completed successfully!");
  } catch (error) {
    console.error("Error during database cleanup:", error);
  }
}

cleanupDatabase().catch(console.error);