import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  project?: any;
  teamMembers: any[];
}

const projectFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phoneNumber: z.string().optional(),
  poc: z.string().optional(),
  type: z.string(),
  affiliatePartner: z.string().optional(),
  category: z.string().optional(),
  lastContacted: z.date().optional(),
  status: z.string(),
  activeStage: z.string().optional(),
  hasInvoice: z.enum(["yes", "no"]).default("no"),
  assignedToId: z.string(),
});

export default function ProjectForm({ open, onClose, project, teamMembers }: ProjectFormProps) {
  const { toast } = useToast();
  const isEdit = !!project?.id;

  const form = useForm<z.infer<typeof projectFormSchema>>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      poc: "",
      type: "direct",
      affiliatePartner: "",
      category: "",
      lastContacted: undefined,
      status: "active",
      activeStage: "",
      hasInvoice: "no",
      assignedToId: teamMembers[0]?.id?.toString() || "",
    },
  });
  
  // Reset form with project data when project changes
  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name || "",
        phoneNumber: project.phoneNumber || "",
        poc: project.poc || "",
        type: project.type || "direct",
        affiliatePartner: project.affiliatePartner || "",
        category: project.category || "",
        lastContacted: project.lastContacted ? new Date(project.lastContacted) : undefined,
        status: project.status || "active",
        activeStage: project.activeStage || "",
        hasInvoice: project.hasInvoice || "no",
        assignedToId: project.assignedToId?.toString() || (teamMembers[0]?.id?.toString() || ""),
      });
    } else {
      form.reset({
        name: "",
        phoneNumber: "",
        poc: "",
        type: "direct",
        affiliatePartner: "",
        category: "",
        lastContacted: undefined,
        status: "active",
        activeStage: "",
        hasInvoice: "no",
        assignedToId: teamMembers[0]?.id?.toString() || "",
      });
    }
  }, [project, form, teamMembers]);

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof projectFormSchema>) => {
      // Convert assignedToId to a number
      const assignedToId = data.assignedToId ? parseInt(data.assignedToId) : undefined;
      
      console.log("Creating project with data:", {
        ...data,
        assignedToId,
        hasInvoice: data.hasInvoice,
        lastContacted: data.lastContacted ? data.lastContacted.toISOString() : null,
      });
      
      await apiRequest("POST", "/api/projects", {
        ...data,
        assignedToId,
        hasInvoice: data.hasInvoice,
        lastContacted: data.lastContacted ? data.lastContacted.toISOString() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      // Also invalidate affiliate-specific and other-specific queries
      if (form.getValues("type") === "affiliate") {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/projects/affiliate/${form.getValues("affiliatePartner")}`] 
        });
      } else if (form.getValues("type") === "other") {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/projects/other/${form.getValues("category")}`] 
        });
      }
      
      onClose();
      form.reset();
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof projectFormSchema>) => {
      // Convert assignedToId to a number
      const assignedToId = data.assignedToId ? parseInt(data.assignedToId) : undefined;
      
      console.log("Updating project with data:", {
        ...data,
        assignedToId,
        hasInvoice: data.hasInvoice,
        lastContacted: data.lastContacted ? data.lastContacted.toISOString() : null,
      });
      
      await apiRequest("PATCH", `/api/projects/${project.id}`, {
        ...data,
        assignedToId,
        hasInvoice: data.hasInvoice,
        lastContacted: data.lastContacted ? data.lastContacted.toISOString() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      // Also invalidate affiliate-specific and other-specific queries
      if (form.getValues("type") === "affiliate") {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/projects/affiliate/${form.getValues("affiliatePartner")}`] 
        });
      } else if (form.getValues("type") === "other") {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/projects/other/${form.getValues("category")}`] 
        });
      }
      
      // Invalidate client data if status changed
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      
      onClose();
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof projectFormSchema>) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const showAffiliateFields = form.watch("type") === "affiliate";
  const showOtherFields = form.watch("type") === "other";
  const isStatusActive = form.watch("status") === "active";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Project" : "Add New Project"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Project name" />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Phone number" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="poc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Point of Contact</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Point of contact" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="direct">Direct</SelectItem>
                        <SelectItem value="affiliate">Affiliate</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {showAffiliateFields && (
                <FormField
                  control={form.control}
                  name="affiliatePartner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Affiliate Partner</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select partner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="kotak">Kotak</SelectItem>
                          <SelectItem value="360-wealth">360 Wealth</SelectItem>
                          <SelectItem value="lgt">LGT</SelectItem>
                          <SelectItem value="pandion">Pandion Partners</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}

              {showOtherFields && (
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="phdcci">PHDCCI</SelectItem>
                          <SelectItem value="idc">IDC</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="pr">PR</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="lastContacted"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Last Contacted</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {isStatusActive && (
              <FormField
                control={form.control}
                name="activeStage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Active Stage</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="nda">NDA</SelectItem>
                        <SelectItem value="im_financial_model">IM/Financial Model</SelectItem>
                        <SelectItem value="el">EL</SelectItem>
                        <SelectItem value="term_sheet">Term Sheet</SelectItem>
                        <SelectItem value="due_diligence">Due Diligence</SelectItem>
                        <SelectItem value="agreement">Agreement</SelectItem>
                        <SelectItem value="investor_tracker">Investor Tracker</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="hasInvoice"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value === true}
                      onCheckedChange={(checked) => {
                        console.log("Invoice checkbox changed to:", checked);
                        field.onChange(checked === true);
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Invoice
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Check if this project has an invoice
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignedToId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary/90"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {isEdit ? "Update" : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
