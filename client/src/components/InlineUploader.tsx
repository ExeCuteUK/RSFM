import { useEffect, useState } from "react";
import Uppy from "@uppy/core";
import { Dashboard } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";

interface InlineUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  note?: string;
}

export function InlineUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  onGetUploadParameters,
  onComplete,
  note = "Drag and drop files here or click to browse",
}: InlineUploaderProps) {
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
      },
      autoProceed: true,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
      .on("complete", (result) => {
        onComplete?.(result);
      })
  );

  useEffect(() => {
    return () => {
      uppy.clear();
      uppy.cancelAll();
    };
  }, [uppy]);

  return (
    <div className="inline-uploader-wrapper">
      <Dashboard
        uppy={uppy}
        proudlyDisplayPoweredByUppy={false}
        height={200}
        width="100%"
        hideUploadButton={true}
        note={note}
        theme="light"
        doneButtonHandler={null}
      />
    </div>
  );
}
