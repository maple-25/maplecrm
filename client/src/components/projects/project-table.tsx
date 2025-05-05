import { useState } from "react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash } from "lucide-react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

interface ProjectTableProps {
  projects: any[];
  isLoading: boolean;
  onEdit: (project: any) => void;
  teamMembers: any[];
}

export default function ProjectTable({ projects, isLoading, onEdit, teamMembers }: ProjectTableProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    setProjectToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (projectToDelete !== null) {
      deleteMutation.mutate(projectToDelete);
      setIsDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex flex-col mt-6">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full py-2 align-middle">
            <div className="overflow-hidden border-b border-gray-200 shadow sm:rounded-lg">
              <div className="bg-white p-4 text-center">Loading projects...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col mt-6">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full py-2 align-middle">
            <div className="overflow-hidden border-b border-gray-200 shadow sm:rounded-lg">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="py-3.5 text-left text-sm font-medium text-gray-500 px-6">Name</TableHead>
                    <TableHead className="py-3.5 text-left text-sm font-medium text-gray-500 px-6">Phone Number</TableHead>
                    <TableHead className="py-3.5 text-left text-sm font-medium text-gray-500 px-6">POC</TableHead>
                    <TableHead className="py-3.5 text-left text-sm font-medium text-gray-500 px-6">Type</TableHead>
                    <TableHead className="py-3.5 text-left text-sm font-medium text-gray-500 px-6">Last Contacted</TableHead>
                    <TableHead className="py-3.5 text-left text-sm font-medium text-gray-500 px-6">Status</TableHead>
                    <TableHead className="py-3.5 text-left text-sm font-medium text-gray-500 px-6">Assigned To</TableHead>
                    <TableHead className="relative py-3.5 px-6">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-6 text-center text-gray-500">
                        No projects found
                      </TableCell>
                    </TableRow>
                  ) : (
                    projects.map((project) => {
                      const assignedTo = getTeamMemberById(project.assignedToId);
                      return (
                        <TableRow key={project.id} className="hover:bg-gray-50">
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{project.name}</div>
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{project.phoneNumber}</div>
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{project.poc}</div>
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 capitalize">
                              {project.type === "affiliate" 
                                ? `${project.type} (${project.affiliatePartner})` 
                                : project.type === "other" 
                                  ? `${project.type} (${project.category})` 
                                  : project.type}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {project.lastContacted
                                ? format(new Date(project.lastContacted), "MMM dd, yyyy")
                                : "Not contacted"}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${getStatusClass(
                                project.status
                              )}`}
                            >
                              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 w-8 h-8">
                                <img
                                  className="w-8 h-8 rounded-full"
                                  src={assignedTo.avatarUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"}
                                  alt=""
                                />
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {assignedTo.name}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(project)}
                                className="text-primary hover:text-primary/80"
                              >
                                <Pencil className="w-5 h-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(project.id)}
                                className="text-secondary hover:text-secondary/80"
                              >
                                <Trash className="w-5 h-5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project and all related data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-secondary hover:bg-secondary/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
