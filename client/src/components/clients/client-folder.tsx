import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Pencil, FolderOpen, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface ClientFolderProps {
  client: {
    id: string;
    name: string;
    lastContacted?: string;
    status?: string;
    documentCount?: number;
  };
  onOpenFolder: () => void;
}

const editClientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export default function ClientFolder({ client, onOpenFolder }: ClientFolderProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof editClientSchema>>({
    resolver: zodResolver(editClientSchema),
    defaultValues: {
      name: client.name,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof editClientSchema>) => {
      await apiRequest("PATCH", `/api/clients/${client.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update client",
        variant: "destructive",
      });
    },
  });

  const onEditClient = (data: z.infer<typeof editClientSchema>) => {
    updateMutation.mutate(data);
  };

  const getStatusClass = (status?: string) => {
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

  return (
    <>
      <Card className="relative flex flex-col overflow-hidden border border-gray-200 rounded-lg group">
        <CardHeader className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 mr-3 text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">{client.name}</h3>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditDialogOpen(true)}
              className="text-gray-400 hover:text-gray-500"
            >
              <Pencil className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Last Contacted:</span>
              <span className="text-sm text-gray-900">
                {client.lastContacted 
                  ? format(new Date(client.lastContacted), "MMM dd, yyyy") 
                  : "Never"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Status:</span>
              <span
                className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${getStatusClass(
                  client.status
                )}`}
              >
                {client.status
                  ? client.status.charAt(0).toUpperCase() + client.status.slice(1)
                  : "Unknown"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Documents:</span>
              <span className="text-sm text-gray-900">
                {client.documentCount || 0} files
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 mt-2 border-t border-gray-200">
          <Button
            onClick={onOpenFolder}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary/90"
          >
            <FolderOpen className="w-5 h-5 mr-2" />
            Open Folder
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditClient)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter client name" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={updateMutation.isPending}
                >
                  Update
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
