import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { JobFileGroup } from "@shared/schema";

interface UseJobFileGroupOptions {
  jobRef?: number;
  enabled?: boolean;
}

export function useJobFileGroup({ jobRef, enabled = true }: UseJobFileGroupOptions) {
  // Fetch job file group
  const { data: fileGroup, isLoading } = useQuery<JobFileGroup>({
    queryKey: ['/api/job-file-groups', jobRef],
    queryFn: async () => {
      if (!jobRef) throw new Error("Job reference is required");
      const response = await fetch(`/api/job-file-groups/${jobRef}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch job file group");
      return response.json();
    },
    enabled: enabled && jobRef !== undefined,
  });

  // Update documents mutation
  const updateDocuments = useMutation({
    mutationFn: async (documents: string[]) => {
      if (!jobRef) throw new Error("Job reference is required");
      
      return await apiRequest(`/api/job-file-groups/${jobRef}/documents`, {
        method: "PATCH",
        body: JSON.stringify({ documents }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      if (jobRef) {
        queryClient.invalidateQueries({ queryKey: ['/api/job-file-groups', jobRef] });
      }
    },
  });

  // Update R.S invoices mutation
  const updateRsInvoices = useMutation({
    mutationFn: async (rsInvoices: string[]) => {
      if (!jobRef) throw new Error("Job reference is required");
      
      return await apiRequest(`/api/job-file-groups/${jobRef}/rs-invoices`, {
        method: "PATCH",
        body: JSON.stringify({ rsInvoices }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      if (jobRef) {
        queryClient.invalidateQueries({ queryKey: ['/api/job-file-groups', jobRef] });
      }
    },
  });

  return {
    fileGroup,
    documents: fileGroup?.documents || [],
    rsInvoices: fileGroup?.rsInvoices || [],
    isLoading,
    updateDocuments: updateDocuments.mutateAsync,
    updateRsInvoices: updateRsInvoices.mutateAsync,
    isUpdatingDocuments: updateDocuments.isPending,
    isUpdatingRsInvoices: updateRsInvoices.isPending,
  };
}
