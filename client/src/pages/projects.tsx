import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ProjectTable from "@/components/projects/project-table";
import ProjectFilters from "@/components/projects/project-filters";
import ProjectForm from "@/components/projects/project-form";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Projects() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: "all",
    assignedTo: "all",
    type: "all",
    lastContacted: "all",
  });

  // Construct query string for filtering
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "all") {
      queryParams.append(key, value);
    }
  });

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ["/api/projects", queryParams.toString()],
    refetchOnWindowFocus: true
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["/api/team-members"],
  });

  const openAddForm = () => {
    setEditingProject(null);
    setIsFormOpen(true);
  };

  const openEditForm = (project: any) => {
    setEditingProject(project);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingProject(null);
  };

  return (
    <div className="py-6">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Projects / Leads</h1>
          <Button onClick={openAddForm} className="bg-primary hover:bg-primary/90">
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Add Project
          </Button>
        </div>

        <ProjectFilters 
          filters={filters} 
          onFilterChange={setFilters} 
          teamMembers={teamMembers || []} 
        />

        <ProjectTable 
          projects={projects || []} 
          isLoading={isLoadingProjects}
          onEdit={openEditForm}
          teamMembers={teamMembers || []}
        />
      </div>

      <ProjectForm 
        open={isFormOpen} 
        onClose={closeForm} 
        project={editingProject}
        teamMembers={teamMembers || []}
      />
    </div>
  );
}
