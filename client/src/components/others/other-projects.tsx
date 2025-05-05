import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Plus } from "lucide-react";

interface OtherProjectsProps {
  projects: any[];
  isLoading: boolean;
  onEdit: (project: any) => void;
  onAdd: () => void;
  teamMembers: any[];
  category: string;
}

export default function OtherProjects({
  projects,
  isLoading,
  onEdit,
  onAdd,
  teamMembers,
  category,
}: OtherProjectsProps) {
  const getStatusClass = (status: string) => {
    switch (status) {
      case "active":
        return "status-active";
      case "pending":
        return "status-pending";
      case "completed":
        return "status-completed";
      case "on-hold":
        return "status-on-hold";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTeamMemberById = (id: number) => {
    return teamMembers.find((member) => member.id === id) || { name: "Unassigned", avatarUrl: "" };
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-medium">{category} Projects</h2>
        <Button onClick={onAdd} className="bg-primary hover:bg-primary/90">
          <Plus className="-ml-1 mr-2 h-5 w-5" />
          Add Project
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 animate-pulse bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">No {category} projects found</p>
          <Button 
            onClick={onAdd} 
            variant="outline" 
            className="mt-2"
          >
            Add your first project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {projects.map((project) => {
            const assignedTo = getTeamMemberById(project.assignedToId);
            return (
              <Card key={project.id} className="overflow-hidden">
                <CardHeader className="pb-2 flex justify-between items-start">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onEdit(project)}
                    className="text-primary hover:text-primary/80 -mt-1 -mr-2"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {project.poc && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Point of Contact:</span>
                        <span className="text-sm">{project.poc}</span>
                      </div>
                    )}
                    {project.phoneNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Phone:</span>
                        <span className="text-sm">{project.phoneNumber}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Last Contacted:</span>
                      <span className="text-sm">
                        {project.lastContacted
                          ? format(new Date(project.lastContacted), "MMM dd, yyyy")
                          : "Not contacted"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Status:</span>
                      <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${getStatusClass(project.status)}`}>
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Assigned To:</span>
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-6 h-6 mr-1">
                          <img
                            className="w-6 h-6 rounded-full"
                            src={assignedTo.avatarUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"}
                            alt=""
                          />
                        </div>
                        <span className="text-sm">{assignedTo.name}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
