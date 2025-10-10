import { useCallback, useState } from "react";
import { Upload, X, FileText, Download, Loader2 } from "lucide-react";
import { Button } from "./button";

interface ObjectStorageUploaderProps {
  value?: string[];
  onChange: (files: string[]) => void;
  pendingFiles?: string[];
  onPendingFilesChange?: (files: string[]) => void;
  maxFiles?: number;
  accept?: string;
  testId?: string;
  label?: string;
  dragDropLabel?: string;
  // Optional job-aware upload metadata
  jobType?: string;
  jobRef?: string;
  documentType?: string;
}

export function ObjectStorageUploader({
  value = [],
  onChange,
  pendingFiles: externalPendingFiles,
  onPendingFilesChange,
  maxFiles = 10,
  accept,
  testId = "object-storage-uploader",
  label = "Attached Files:",
  dragDropLabel = "Drop files here or click to browse",
  jobType,
  jobRef,
  documentType,
}: ObjectStorageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [internalPendingFiles, setInternalPendingFiles] = useState<string[]>([]);
  
  const pendingFiles = externalPendingFiles !== undefined ? externalPendingFiles : internalPendingFiles;
  const setPendingFiles = onPendingFilesChange || setInternalPendingFiles;

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    const uploadedPaths: string[] = [];
    const useJobAwareUpload = jobType && jobRef && documentType;

    try {
      for (const file of files) {
        // Create FormData for upload to backend
        const formData = new FormData();
        formData.append('file', file);
        formData.append('filename', file.name);
        
        // If job metadata provided, use job-aware upload (like card drag-and-drop)
        if (useJobAwareUpload) {
          formData.append('jobType', jobType);
          formData.append('jobRef', jobRef);
          formData.append('documentType', documentType);
        }

        console.log('[CLIENT DEBUG] Uploading file:', file.name, 'job-aware:', !!useJobAwareUpload);
        
        const response = await fetch("/api/objects/upload", {
          method: "POST",
          body: formData,
          credentials: "include"
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        
        // For job-aware uploads, store file objects {filename, path}
        // For generic uploads, store just the path (backward compatibility)
        if (useJobAwareUpload) {
          uploadedPaths.push(JSON.stringify({ filename: data.filename, path: data.objectPath }));
        } else {
          uploadedPaths.push(data.objectPath);
        }
      }

      console.log('[UPLOADER DEBUG] Upload complete, uploadedPaths:', uploadedPaths);
      
      if (onPendingFilesChange) {
        const newPendingFiles = [...pendingFiles, ...uploadedPaths];
        onPendingFilesChange(newPendingFiles);
      } else {
        setInternalPendingFiles((prev) => [...prev, ...uploadedPaths]);
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = useCallback(
    async (files: FileList) => {
      const remainingSlots = maxFiles - value.length - pendingFiles.length;
      const filesToAdd = Array.from(files).slice(0, remainingSlots);

      if (filesToAdd.length > 0) {
        await uploadFiles(filesToAdd);
      }
    },
    [value.length, pendingFiles.length, maxFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const removePendingFile = useCallback(
    (index: number) => {
      if (onPendingFilesChange) {
        onPendingFilesChange(pendingFiles.filter((_, i) => i !== index));
      } else {
        setInternalPendingFiles((prev) => prev.filter((_, i) => i !== index));
      }
    },
    [pendingFiles, onPendingFilesChange]
  );

  const removeSavedFile = useCallback(
    (index: number) => {
      const newFiles = value.filter((_, i) => i !== index);
      onChange(newFiles);
    },
    [value, onChange]
  );

  // Helper to parse file data (handles objects, JSON strings, and legacy path strings)
  const parseFileData = (fileData: any): { filename: string; path: string } => {
    // If it's already an object with filename and path, return it
    if (typeof fileData === 'object' && fileData !== null && fileData.filename && fileData.path) {
      return { filename: fileData.filename, path: fileData.path };
    }
    
    // If it's a string, try to parse as JSON
    if (typeof fileData === 'string') {
      try {
        const parsed = JSON.parse(fileData);
        if (parsed.filename && parsed.path) {
          return parsed;
        }
      } catch {
        // Not JSON, treat as legacy path string
      }
      
      // Legacy format: extract filename from path
      const filename = fileData.split('/').pop()?.split('?')[0] || 'File';
      return { filename, path: fileData };
    }
    
    // Fallback
    return { filename: 'File', path: '' };
  };

  const normalizeFilePath = (fileData: any) => {
    const { path } = parseFileData(fileData);
    return path.startsWith('/') ? path : `/objects/${path}`;
  };

  const isMaxFiles = value.length + pendingFiles.length >= maxFiles;

  return (
    <div className="space-y-3">
      {!isMaxFiles && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-md p-6 text-center transition-colors
            ${isDragging ? "border-primary bg-primary/5" : "border-border hover-elevate"}
            ${uploading ? "opacity-50 pointer-events-none" : ""}
          `}
          data-testid={`${testId}-dropzone`}
        >
          <input
            type="file"
            multiple
            accept={accept}
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            data-testid={`${testId}-input`}
            disabled={uploading}
          />
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-6 h-6 mx-auto mb-2 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-foreground mb-1">
                {dragDropLabel}
              </p>
              <p className="text-xs text-muted-foreground">
                {maxFiles - value.length - pendingFiles.length} file{maxFiles - value.length - pendingFiles.length !== 1 ? "s" : ""} remaining
              </p>
            </>
          )}
        </div>
      )}

      {(pendingFiles.length > 0 || value.length > 0) && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <div className="space-y-2">
            {pendingFiles.map((fileData, index) => {
              const { filename } = parseFileData(fileData);
              return (
                <div
                  key={`pending-${index}`}
                  className="flex items-center justify-between p-2 border rounded-md bg-muted/30"
                  data-testid={`${testId}-pending-${index}`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{filename}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePendingFile(index)}
                    data-testid={`${testId}-remove-pending-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            {value.map((fileData, index) => {
              const { filename } = parseFileData(fileData);
              const downloadPath = normalizeFilePath(fileData);
              return (
                <div
                  key={`saved-${index}`}
                  className="flex items-center justify-between p-2 border rounded-md"
                  data-testid={`${testId}-saved-${index}`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{filename}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <a href={downloadPath} target="_blank" rel="noopener noreferrer">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        data-testid={`${testId}-download-${index}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSavedFile(index)}
                      data-testid={`${testId}-delete-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
