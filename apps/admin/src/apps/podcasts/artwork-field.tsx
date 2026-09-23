import React from 'react';
import { Label, LoadingIndicator } from '@tryghost/shade/components';
import {
  ImageUpload,
  ImageUploadAction,
  ImageUploadActions,
  ImageUploadDropzone,
  ImageUploadImage,
  ImageUploadPreview,
} from '@tryghost/shade/patterns';
import { Stack } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { getImageUrl, useUploadImage } from '@tryghost/admin-x-framework/api/images';
import {
  ACCEPTED_IMAGE_TYPES,
  UNSUPPORTED_IMAGE_MESSAGE,
  uploadErrorMessage,
} from '@/shared/images/image-upload';
import { toast } from 'sonner';

interface ArtworkFieldProps {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (url: string) => void;
  /** Reports an in-flight upload so the owner can hold off saving. */
  onUploadPendingChange?: (pending: boolean) => void;
}

/**
 * One artwork slot on a podcast or episode form, in the same shape as the
 * tag image field: an upload dropzone when empty, a preview with a remove
 * action when set. Uploads go through the images API.
 */
export function ArtworkField({
  id,
  label,
  value,
  disabled,
  onChange,
  onUploadPendingChange,
}: ArtworkFieldProps) {
  const { mutateAsync: uploadImage, isPending } = useUploadImage();
  const mountedRef = React.useRef(true);
  const onUploadPendingChangeRef = React.useRef(onUploadPendingChange);
  onUploadPendingChangeRef.current = onUploadPendingChange;

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      onUploadPendingChangeRef.current?.(false);
    };
  }, []);

  React.useEffect(() => {
    onUploadPendingChangeRef.current?.(isPending);
  }, [isPending]);

  const handleUpload = async (file: File) => {
    try {
      const response = await uploadImage({ file });
      if (mountedRef.current) {
        onChange(getImageUrl(response));
      }
    } catch (error) {
      if (mountedRef.current) {
        toast.error(uploadErrorMessage(error, label.toLowerCase()));
      }
    }
  };

  const fieldDisabled = disabled || isPending;

  return (
    <Stack gap="sm">
      <Label htmlFor={id}>{label}</Label>
      <ImageUpload className="h-40">
        {value ? (
          <ImageUploadPreview>
            <ImageUploadImage alt="" src={value} />
            <ImageUploadActions>
              <ImageUploadAction
                aria-label={`Remove ${label.toLowerCase()}`}
                disabled={fieldDisabled}
                onClick={() => onChange('')}
              >
                <LucideIcon.Trash2 />
              </ImageUploadAction>
            </ImageUploadActions>
          </ImageUploadPreview>
        ) : (
          <ImageUploadDropzone
            accept={ACCEPTED_IMAGE_TYPES}
            disabled={fieldDisabled}
            inputAriaLabel={`Upload ${label.toLowerCase()}`}
            inputId={id}
            onDropAccepted={(files) => files[0] && void handleUpload(files[0])}
            onDropRejected={() => toast.error(UNSUPPORTED_IMAGE_MESSAGE)}
          >
            {isPending ? (
              <LoadingIndicator size="sm" />
            ) : (
              <span className="text-sm text-muted-foreground">Upload {label.toLowerCase()}</span>
            )}
          </ImageUploadDropzone>
        )}
      </ImageUpload>
    </Stack>
  );
}

export default ArtworkField;
