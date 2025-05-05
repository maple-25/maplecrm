import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DocumentUpload from "./document-upload";
import { ArrowLeft, Trash, Download, FileText } from "lucide-react";

interface FolderViewProps {
  clientId: string;
  onBack: () => void;
}

export default function FolderView({ clientId, onBack }: FolderViewProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: [`/api/clients/${clientId}`],
  });

  const { data: documents, isLoading: isLoadingDocuments } = useQuery({
    queryKey: [`/api/clients/${clientId}/documents`],
  });

  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: [`/api/clients/${clientId}/projects`],
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await apiRequest("DELETE", `/api/clients/${clientId}/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/documents`] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsDeleteDialogOpen(false);
      setDocumentToDelete(null);
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (documentId: string) => {
    setDocumentToDelete(documentId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (documentToDelete) {
      deleteMutation.mutate(documentToDelete);
    }
  };

  if (isLoadingClient) {
    return (
      <div className="flex justify-center py-8">
        <p>Loading client information...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Folders
          </Button>
          <DocumentUpload clientId={clientId} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{client?.name || "Client Folder"}</CardTitle>
            <CardDescription>
              Last contacted: {client?.lastContacted ? format(new Date(client.lastContacted), "MMMM d, yyyy") : "Never"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Client Information</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium text-gray-500">Status:</div>
                  <div className="text-sm">
                    {client?.status ? (
                      <span
                        className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                          client.status === "active"
                            ? "status-active"
                            : client.status === "pending"
                            ? "status-pending"
                            : client.status === "completed"
                            ? "status-completed"
                            : "status-on-hold"
                        }`}
                      >
                        {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                      </span>
                    ) : (
                      "Unknown"
                    )}
                  </div>
                  <div className="text-sm font-medium text-gray-500">Total Documents:</div>
                  <div className="text-sm">{documents?.length || 0}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Associated Projects</h3>
                {isLoadingProjects ? (
                  <p className="text-sm">Loading projects...</p>
                ) : projects?.length > 0 ? (
                  <ul className="space-y-2">
                    {projects.map((project: any) => (
                      <li key={project.id} className="flex items-center justify-between">
                        <span className="text-sm">{project.name}</span>
                        <span
                          className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                            project.status === "active"
                              ? "status-active"
                              : project.status === "pending"
                              ? "status-pending"
                              : project.status === "completed"
                              ? "status-completed"
                              : "status-on-hold"
                          }`}
                        >
                          {project.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No associated projects found</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-4 text-lg font-medium">Documents</h2>
          {isLoadingDocuments ? (
            <p>Loading documents...</p>
          ) : documents?.length > 0 ? (
            <div className="overflow-hidden border border-gray-200 rounded-md">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="py-3.5 text-left text-sm font-medium text-gray-500 pl-6">File Name</TableHead>
                    <TableHead className="py-3.5 text-left text-sm font-medium text-gray-500">Type</TableHead>
                    <TableHead className="py-3.5 text-left text-sm font-medium text-gray-500">Uploaded On</TableHead>
                    <TableHead className="py-3.5 text-left text-sm font-medium text-gray-500">Size</TableHead>
                    <TableHead className="relative py-3.5 px-6">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc: any) => (
                    <TableRow key={doc.id} className="hover:bg-gray-50">
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 mr-2 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-sm text-gray-500">{doc.mimeType || "Unknown"}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-sm text-gray-500">
                          {doc.createdAt ? format(new Date(doc.createdAt), "MMM dd, yyyy") : "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-sm text-gray-500">
                          {doc.size ? `${Math.round(doc.size / 1024)} KB` : "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 pr-6">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-gray-500"
                            asChild
                          >
                            <a href={`/api/clients/${clientId}/documents/${doc.id}/download`} download>
                              <Download className="w-5 h-5" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(doc.id)}
                            className="text-secondary hover:text-secondary/80"
                          >
                            <Trash className="w-5 h-5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center border border-dashed border-gray-300 rounded-md">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">No documents found</p>
              <p className="mt-1 text-sm text-gray-400">
                Upload a document to get started
              </p>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the document.
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
