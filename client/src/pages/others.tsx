import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OtherProjects from "@/components/others/other-projects";
import ProjectForm from "@/components/projects/project-form";

export default function Others() {
  const [activeTab, setActiveTab] = useState("phdcci");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);

  const { data: teamMembers } = useQuery({
    queryKey: ["/api/team-members"],
  });

  const { data: phdcciProjects, isLoading: isLoadingPHDCCI } = useQuery({
    queryKey: ["/api/projects/other/phdcci"],
  });

  const { data: idcProjects, isLoading: isLoadingIDC } = useQuery({
    queryKey: ["/api/projects/other/idc"],
  });

  const { data: marketingProjects, isLoading: isLoadingMarketing } = useQuery({
    queryKey: ["/api/projects/other/marketing"],
  });

  const { data: prProjects, isLoading: isLoadingPR } = useQuery({
    queryKey: ["/api/projects/other/pr"],
  });

  const openAddForm = () => {
    // Pre-set the type and category based on the active tab
    setEditingProject({
      type: "other",
      category: activeTab
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

  return (
    <div className="py-6">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Other Projects</h1>

        <Tabs defaultValue="phdcci" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="border-b border-gray-200 w-full justify-start mb-6">
            <TabsTrigger value="phdcci" className="px-4 py-2 -mb-px">PHDCCI</TabsTrigger>
            <TabsTrigger value="idc" className="px-4 py-2 -mb-px">IDC</TabsTrigger>
            <TabsTrigger value="marketing" className="px-4 py-2 -mb-px">Marketing</TabsTrigger>
            <TabsTrigger value="pr" className="px-4 py-2 -mb-px">PR</TabsTrigger>
          </TabsList>

          <TabsContent value="phdcci">
            <OtherProjects
              projects={phdcciProjects || []}
              isLoading={isLoadingPHDCCI}
              onEdit={openEditForm}
              onAdd={openAddForm}
              teamMembers={teamMembers || []}
              category="PHDCCI"
            />
          </TabsContent>

          <TabsContent value="idc">
            <OtherProjects
              projects={idcProjects || []}
              isLoading={isLoadingIDC}
              onEdit={openEditForm}
              onAdd={openAddForm}
              teamMembers={teamMembers || []}
              category="IDC"
            />
          </TabsContent>

          <TabsContent value="marketing">
            <OtherProjects
              projects={marketingProjects || []}
              isLoading={isLoadingMarketing}
              onEdit={openEditForm}
              onAdd={openAddForm}
              teamMembers={teamMembers || []}
              category="Marketing"
            />
          </TabsContent>

          <TabsContent value="pr">
            <OtherProjects
              projects={prProjects || []}
              isLoading={isLoadingPR}
              onEdit={openEditForm}
              onAdd={openAddForm}
              teamMembers={teamMembers || []}
              category="PR"
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
