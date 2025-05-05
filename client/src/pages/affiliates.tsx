import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AffiliateTable from "@/components/affiliates/affiliate-table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ProjectForm from "@/components/projects/project-form";
import { useToast } from "@/hooks/use-toast";

export default function Affiliates() {
  const [activeTab, setActiveTab] = useState("kotak");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const { toast } = useToast();

  const { data: teamMembers } = useQuery({
    queryKey: ["/api/team-members"],
  });

  const { data: kotakProjects, isLoading: isLoadingKotak } = useQuery({
    queryKey: ["/api/projects/affiliate/kotak"],
  });

  const { data: wealthProjects, isLoading: isLoadingWealth } = useQuery({
    queryKey: ["/api/projects/affiliate/360-wealth"],
  });

  const { data: lgtProjects, isLoading: isLoadingLGT } = useQuery({
    queryKey: ["/api/projects/affiliate/lgt"],
  });

  const { data: pandionProjects, isLoading: isLoadingPandion } = useQuery({
    queryKey: ["/api/projects/affiliate/pandion"],
  });

  const openAddForm = () => {
    // Pre-set the affiliate based on the active tab
    setEditingProject({
      type: "affiliate",
      affiliatePartner: activeTab
    });
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

  const handleDelete = async (projectId: number) => {
    try {
      await apiRequest("DELETE", `/api/projects/${projectId}`);
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="py-6">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Affiliate Projects</h1>

        <Tabs defaultValue="kotak" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="border-b border-gray-200 w-full justify-start mb-6">
            <TabsTrigger value="kotak" className="px-4 py-2 -mb-px">Kotak</TabsTrigger>
            <TabsTrigger value="360-wealth" className="px-4 py-2 -mb-px">360 Wealth</TabsTrigger>
            <TabsTrigger value="lgt" className="px-4 py-2 -mb-px">LGT</TabsTrigger>
            <TabsTrigger value="pandion" className="px-4 py-2 -mb-px">Pandion Partners</TabsTrigger>
          </TabsList>

          <TabsContent value="kotak">
            <AffiliateTable
              projects={kotakProjects || []}
              isLoading={isLoadingKotak}
              onEdit={openEditForm}
              onDelete={handleDelete}
              onAdd={openAddForm}
              teamMembers={teamMembers || []}
              partner="Kotak"
            />
          </TabsContent>

          <TabsContent value="360-wealth">
            <AffiliateTable
              projects={wealthProjects || []}
              isLoading={isLoadingWealth}
              onEdit={openEditForm}
              onDelete={handleDelete}
              onAdd={openAddForm}
              teamMembers={teamMembers || []}
              partner="360 Wealth"
            />
          </TabsContent>

          <TabsContent value="lgt">
            <AffiliateTable
              projects={lgtProjects || []}
              isLoading={isLoadingLGT}
              onEdit={openEditForm}
              onDelete={handleDelete}
              onAdd={openAddForm}
              teamMembers={teamMembers || []}
              partner="LGT"
            />
          </TabsContent>

          <TabsContent value="pandion">
            <AffiliateTable
              projects={pandionProjects || []}
              isLoading={isLoadingPandion}
              onEdit={openEditForm}
              onDelete={handleDelete}
              onAdd={openAddForm}
              teamMembers={teamMembers || []}
              partner="Pandion Partners"
            />
          </TabsContent>
        </Tabs>
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
