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
}: ObjectStorageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [internalPendingFiles, setInternalPendingFiles] = useState<string[]>([]);
  
  const pendingFiles = externalPendingFiles !== undefined ? externalPendingFiles : internalPendingFiles;
  const setPendingFiles = onPendingFilesChange || setInternalPendingFiles;

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    const uploadedPaths: string[] = [];

    try {
      for (const file of files) {
        const response = await fetch("/api/objects/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name }),
        });

        const data = await response.json();
        
        await fetch(data.uploadURL, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        });

        uploadedPaths.push(data.objectPath);
      }

      console.log('[UPLOADER DEBUG] Upload complete, uploadedPaths:', uploadedPaths);
      console.log('[UPLOADER DEBUG] onPendingFilesChange exists?', !!onPendingFilesChange);
      console.log('[UPLOADER DEBUG] pendingFiles before:', pendingFiles);
      
      if (onPendingFilesChange) {
        const newPendingFiles = [...pendingFiles, ...uploadedPaths];
        console.log('[UPLOADER DEBUG] Calling onPendingFilesChange with:', newPendingFiles);
        onPendingFilesChange(newPendingFiles);
      } else {
        console.log('[UPLOADER DEBUG] No callback, using internal state');
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

  const normalizeFilePath = (path: string) => {
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
            {pendingFiles.map((url, index) => (
              <div
                key={`pending-${index}`}
                className="flex items-center justify-between p-2 border rounded-md bg-muted/30"
                data-testid={`${testId}-pending-${index}`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate">{url.split('/').pop()?.split('?')[0] || 'File'}</span>
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
            ))}
            {value.map((path, index) => {
              const downloadPath = normalizeFilePath(path);
              return (
                <div
                  key={`saved-${index}`}
                  className="flex items-center justify-between p-2 border rounded-md"
                  data-testid={`${testId}-saved-${index}`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{path.split('/').pop() || 'File'}</span>
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
