import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClientFolder from "@/components/clients/client-folder";
import FolderView from "@/components/clients/folder-view";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Define schema for client creation form
const clientFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters")
});

export default function Clients() {
  const [activeTab, setActiveTab] = useState("active");
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof clientFormSchema>>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const { data: activeClients, isLoading: isLoadingActive } = useQuery({
    queryKey: ["/api/clients?status=active"],
  });

  const { data: pastClients, isLoading: isLoadingPast } = useQuery({
    queryKey: ["/api/clients?status=completed"],
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: z.infer<typeof clientFormSchema>) => {
      console.log("Submitting client creation with data:", {
        ...data,
        status: activeTab === "active" ? "active" : "completed"
      });
      
      return await apiRequest("POST", "/api/clients", {
        name: data.name,
        status: activeTab === "active" ? "active" : "completed",
      });
    },
    onSuccess: () => {
      // Invalidate clients cache to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients?status=${activeTab}`] });
      
      setIsAddClientOpen(false);
      form.reset();
      
      toast({
        title: "Success",
        description: "Client folder created successfully",
      });
    },
    onError: (error: any) => {
      console.error("Error creating client:", error);
      
      toast({
        title: "Error",
        description: error.message || "Failed to create client folder",
        variant: "destructive",
      });
    }
  });
  
  const onAddClient = (data: z.infer<typeof clientFormSchema>) => {
    createClientMutation.mutate(data);
  };

  const handleOpenFolder = (clientId: string) => {
    setSelectedClient(clientId);
  };

  const handleCloseFolder = () => {
    setSelectedClient(null);
  };

  return (
    <div className="py-6">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
          <Button 
            onClick={() => setIsAddClientOpen(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Add Client
          </Button>
        </div>

        <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="border-b border-gray-200 w-full justify-start mb-6">
            <TabsTrigger value="active" className="px-4 py-2 -mb-px">Active Projects</TabsTrigger>
            <TabsTrigger value="past" className="px-4 py-2 -mb-px">Past Projects</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {!selectedClient ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {isLoadingActive ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="h-52 rounded-lg bg-gray-100 animate-pulse" />
                  ))
                ) : activeClients?.length > 0 ? (
                  activeClients.map((client: any) => (
                    <ClientFolder
                      key={client.id}
                      client={client}
                      onOpenFolder={() => handleOpenFolder(client.id)}
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500">No active clients found</p>
                    <Button 
                      onClick={() => setIsAddClientOpen(true)}
                      variant="outline" 
                      className="mt-2"
                    >
                      Add a client
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <FolderView clientId={selectedClient} onBack={handleCloseFolder} />
            )}
          </TabsContent>

          <TabsContent value="past">
            {!selectedClient ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {isLoadingPast ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="h-52 rounded-lg bg-gray-100 animate-pulse" />
                  ))
                ) : pastClients?.length > 0 ? (
                  pastClients.map((client: any) => (
                    <ClientFolder
                      key={client.id}
                      client={client}
                      onOpenFolder={() => handleOpenFolder(client.id)}
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500">No past clients found</p>
                  </div>
                )}
              </div>
            ) : (
              <FolderView clientId={selectedClient} onBack={handleCloseFolder} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Create a new client folder to store documents and track projects.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onAddClient)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter client name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => {
                    setIsAddClientOpen(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90"
                  disabled={createClientMutation.isPending}
                >
                  {createClientMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
