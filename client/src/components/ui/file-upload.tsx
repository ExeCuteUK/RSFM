import { useCallback, useState } from "react";
import { Upload, X, FileIcon } from "lucide-react";
import { Button } from "./button";
import { Badge } from "./badge";

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

interface FileUploadProps {
  value?: FileMetadata[];
  onChange: (files: FileMetadata[]) => void;
  maxFiles?: number;
  accept?: string;
  testId?: string;
}

export function FileUpload({
  value = [],
  onChange,
  maxFiles = 25,
  accept,
  testId = "file-upload",
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const handleFiles = useCallback(
    (files: FileList) => {
      const remainingSlots = maxFiles - value.length;
      const filesToAdd = Array.from(files).slice(0, remainingSlots);

      const newFiles: FileMetadata[] = filesToAdd.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      }));

      onChange([...value, ...newFiles]);
    },
    [value, onChange, maxFiles]
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

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = value.filter((_, i) => i !== index);
      onChange(newFiles);
    },
    [value, onChange]
  );

  const isMaxFiles = value.length >= maxFiles;

  return (
    <div className="space-y-4">
      {!isMaxFiles && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-md p-8 text-center transition-colors
            ${isDragging ? "border-primary bg-primary/5" : "border-border hover-elevate"}
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
          />
          <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-foreground mb-1">
            Drop files here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            {maxFiles - value.length} file{maxFiles - value.length !== 1 ? "s" : ""} remaining
          </p>
        </div>
      )}

      {value.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Attached Files:</p>
          <div className="space-y-2">
            {value.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 p-3 rounded-md bg-card border border-border"
                data-testid={`${testId}-file-${index}`}
              >
                <FileIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  data-testid={`${testId}-remove-${index}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
