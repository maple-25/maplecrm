import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      // Using custom fetch for multipart/form-data instead of apiRequest
      const res = await fetch(`/api/clients/${clientId}/documents`, {
        method: "POST",
        body: formData,
        // Don't set Content-Type header, let the browser set it with boundary
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
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", fileName);

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

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
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
              </div>

              <div>
                <Label htmlFor="document">Document File</Label>
                <Input
                  id="document"
                  type="file"
                  onChange={handleFileChange}
                  className="mt-1"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploadOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={!file || uploadMutation.isPending}
                >
                  Upload
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
