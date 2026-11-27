import { useCallback } from 'react';
import { toast } from 'sonner';
import { getImageUrl, useUploadImage } from '@tryghost/admin-x-framework/api/images';
import { uploadErrorMessage } from '@/shared/images/image-upload';
import { EDITOR_REQUEST_OPTIONS } from './request-options';

export interface ImageFieldUpload {
  isUploading: boolean;
  /** Resolves whether the upload landed; a failure has already been reported. */
  onUpload: (file: File) => Promise<boolean>;
}

/** Keep upload state in the field's owner so closing its pane does not reset it. */
export function useImageFieldUpload(
  subject: string,
  onChange: (src: string) => void,
): ImageFieldUpload {
  const { mutateAsync: uploadImage, isPending: isUploading } = useUploadImage();
  const onUpload = useCallback(
    async (file: File) => {
      try {
        onChange(getImageUrl(await uploadImage({ file, ...EDITOR_REQUEST_OPTIONS })));
        return true;
      } catch (error) {
        toast.error(uploadErrorMessage(error, subject));
        return false;
      }
    },
    [onChange, subject, uploadImage],
  );

  return { isUploading, onUpload };
}
