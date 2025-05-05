import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, FilterIcon, PlusIcon, SearchIcon } from "lucide-react";
import { getQueryFn, queryClient } from "@/lib/queryClient";

interface Invoice {
  id: number;
  projectId: number;
  projectName: string;
  clientName: string;
  amount: number;
  status: "draft" | "pending" | "paid" | "overdue";
  dueDate: string;
  createdAt: string;
}

// Mock data - will be replaced with actual API integration
const dummyInvoices: Invoice[] = [
  {
    id: 1,
    projectId: 101,
    projectName: "Series A Funding",
    clientName: "TechStart Inc.",
    amount: 25000,
    status: "paid",
    dueDate: "2025-05-20",
    createdAt: "2025-04-05"
  },
  {
    id: 2,
    projectId: 102,
    projectName: "Merger & Acquisition",
    clientName: "GrowthCorp",
    amount: 50000,
    status: "pending",
    dueDate: "2025-05-30",
    createdAt: "2025-04-15"
  },
  {
    id: 3,
    projectId: 103,
    projectName: "Debt Restructuring",
    clientName: "Industrial Solutions",
    amount: 35000,
    status: "draft",
    dueDate: "2025-06-15",
    createdAt: "2025-04-25"
  },
  {
    id: 4,
    projectId: 104,
    projectName: "IPO Advisory",
    clientName: "Future Tech",
    amount: 75000,
    status: "overdue",
    dueDate: "2025-05-01",
    createdAt: "2025-04-01"
  }
];

const formSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  amount: z.string().min(1, "Amount is required"),
  dueDate: z.string().min(1, "Due date is required"),
  status: z.string().min(1, "Status is required")
});

export default function Invoices() {
  const [activeTab, setActiveTab] = useState("all");
  const [openNewInvoice, setOpenNewInvoice] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: "",
      amount: "",
      dueDate: "",
      status: "draft"
    }
  });

  const { isLoading: isProjectsLoading, data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: getQueryFn({ on401: "returnNull" })
  });

  const { isLoading, data: invoices = dummyInvoices } = useQuery({
    queryKey: ["/api/invoices"],
    queryFn: () => Promise.resolve(dummyInvoices), // Will be replaced with actual API
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const filteredInvoices = activeTab === "all" 
    ? invoices 
    : invoices.filter(invoice => invoice.status === activeTab);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    toast({
      title: "Invoice created",
      description: `New invoice for $${values.amount} has been created.`
    });
    setOpenNewInvoice(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        <Dialog open={openNewInvoice} onOpenChange={setOpenNewInvoice}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <PlusIcon className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
              <DialogDescription>
                Create a new invoice for a project. Link it to an existing project.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isProjectsLoading ? (
                            <SelectItem value="loading" disabled>Loading projects...</SelectItem>
                          ) : projects && projects.length > 0 ? (
                            projects.map((project: any) => (
                              <SelectItem key={project.id} value={project.id.toString()}>
                                {project.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No projects available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-2">$</span>
                          <Input
                            {...field}
                            type="number"
                            className="pl-6"
                            placeholder="0.00"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type="date"
                            className="pl-3"
                          />
                          <CalendarIcon className="absolute right-3 top-2 h-4 w-4 opacity-50" />
                        </div>
                      </FormControl>
                      <FormMessage />
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
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setOpenNewInvoice(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create Invoice</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex justify-between items-center">
        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Invoices</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
          </TabsList>
          <div className="mt-4 flex justify-between">
            <div className="relative w-72">
              <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon">
              <FilterIcon className="h-4 w-4" />
            </Button>
          </div>
          <TabsContent value="all" className="mt-4">
            <InvoiceTable invoices={filteredInvoices} isLoading={isLoading} getStatusBadge={getStatusBadge} />
          </TabsContent>
          <TabsContent value="pending" className="mt-4">
            <InvoiceTable invoices={filteredInvoices} isLoading={isLoading} getStatusBadge={getStatusBadge} />
          </TabsContent>
          <TabsContent value="paid" className="mt-4">
            <InvoiceTable invoices={filteredInvoices} isLoading={isLoading} getStatusBadge={getStatusBadge} />
          </TabsContent>
          <TabsContent value="draft" className="mt-4">
            <InvoiceTable invoices={filteredInvoices} isLoading={isLoading} getStatusBadge={getStatusBadge} />
          </TabsContent>
          <TabsContent value="overdue" className="mt-4">
            <InvoiceTable invoices={filteredInvoices} isLoading={isLoading} getStatusBadge={getStatusBadge} />
          </TabsContent>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard title="Total Outstanding" value="$85,000" subValue="+5.4% from last month" />
        <SummaryCard title="Paid This Month" value="$25,000" subValue="3 invoices" />
        <SummaryCard title="Overdue" value="$75,000" subValue="1 invoice" />
      </div>
    </div>
  );
}

function InvoiceTable({ 
  invoices, 
  isLoading, 
  getStatusBadge 
}: { 
  invoices: Invoice[]; 
  isLoading: boolean; 
  getStatusBadge: (status: string) => React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                </TableRow>
              ))
            ) : invoices.length > 0 ? (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>INV-{invoice.id.toString().padStart(4, '0')}</TableCell>
                  <TableCell>{invoice.projectName}</TableCell>
                  <TableCell>{invoice.clientName}</TableCell>
                  <TableCell>${invoice.amount.toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">View</Button>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  No invoices found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ 
  title, 
  value, 
  subValue 
}: { 
  title: string; 
  value: string; 
  subValue: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
      </CardContent>
    </Card>
  );
}