import { useCallback, useState } from 'react';
import { getImageUrl, useUploadImage } from '@tryghost/admin-x-framework/api/images';
import { APIError, JSONError, type ErrorResponse } from '@tryghost/admin-x-framework/errors';
import { uploadErrorMessage } from '@/shared/images/image-upload';
import { EDITOR_REQUEST_OPTIONS } from './request-options';

export interface ImageFieldUpload {
  isUploading: boolean;
  /** How much of the file has been sent, from 0 to 100. */
  progress: number;
  /** Why the last upload failed, until the field changes or another upload starts. */
  error: string | null;
  /** Resolves whether the upload landed; a failure is held in `error`. */
  onUpload: (file: File) => Promise<boolean>;
  /** Sends the file whose upload failed again. */
  retry: () => void;
  clearError: () => void;
}

/** The server's own explanation of a refused upload, which Ghost puts in `context`. */
function serverContext(error: unknown): string | null {
  if (error instanceof JSONError) {
    return error.data?.errors?.[0]?.context || null;
  }
  // 413 and 415 bodies reach here as unparsed text.
  if (error instanceof APIError && typeof error.data === 'string') {
    try {
      return (JSON.parse(error.data) as Partial<ErrorResponse>).errors?.[0]?.context || null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Keep upload state in the field's owner so closing its pane does not reset it. */
export function useImageFieldUpload(
  subject: string,
  onChange: (src: string) => void,
): ImageFieldUpload {
  const { mutateAsync: uploadImage, isPending: isUploading } = useUploadImage();
  const [progress, setProgress] = useState(0);
  const [failure, setFailure] = useState<{ file: File; message: string } | null>(null);

  const onUpload = useCallback(
    async (file: File) => {
      setFailure(null);
      setProgress(0);
      try {
        const response = await uploadImage({
          file,
          ...EDITOR_REQUEST_OPTIONS,
          onUploadProgress: (sent) => setProgress(Math.round(sent)),
        });
        onChange(getImageUrl(response));
        return true;
      } catch (error) {
        setFailure({ file, message: serverContext(error) || uploadErrorMessage(error, subject) });
        return false;
      }
    },
    [onChange, subject, uploadImage],
  );

  const retry = useCallback(() => {
    if (failure) {
      void onUpload(failure.file);
    }
  }, [failure, onUpload]);

  const clearError = useCallback(() => setFailure(null), []);

  return { isUploading, progress, error: failure?.message ?? null, onUpload, retry, clearError };
}
