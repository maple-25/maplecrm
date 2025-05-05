import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";

interface DocumentUploadProps {
  clientId: string;
}

export default function DocumentUpload({ clientId }: DocumentUploadProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(`/api/clients/${clientId}/documents`, {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to upload document");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/documents`] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsUploadOpen(false);
      setFile(null);
      setFileName("");
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    // Create fresh FormData object
    const formData = new FormData();
    
    // Add file with the field name 'file' to match the server's expectation
    formData.append("file", file);
    
    // Add name field
    formData.append("name", fileName || file.name);
    
    console.log("Submitting document upload:", {
      fileName,
      fileType: file.type,
      fileSize: file.size,
      hasFile: formData.has('file'),
      hasName: formData.has('name')
    });
    
    uploadMutation.mutate(formData);
  };

  return (
    <>
      <Button
        onClick={() => setIsUploadOpen(true)}
        className="flex items-center bg-primary hover:bg-primary/90"
      >
        <Upload className="w-4 h-4 mr-2" />
        Upload Document
      </Button>

      <Dialog 
        open={isUploadOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setFile(null);
            setFileName("");
          }
          setIsUploadOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Add a document to this client's folder. Supported file types: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="documentName">Document Name</Label>
                <Input
                  id="documentName"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Enter document name"
                  className="mt-1"
                  required
                />
                {fileName && fileName.length < 2 && (
                  <p className="text-sm text-red-500 mt-1">Name must be at least 2 characters</p>
                )}
              </div>

              <div>
                <Label htmlFor="document">Document File</Label>
                <Input
                  id="document"
                  type="file"
                  onChange={handleFileChange}
                  className="mt-1"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  required
                />
                {!file && (
                  <p className="text-sm text-muted-foreground mt-1">Please select a file to upload</p>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsUploadOpen(false);
                    setFile(null);
                    setFileName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={!file || fileName.length < 2 || uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
