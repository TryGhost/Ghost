import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { LoadingIndicator } from '@tryghost/shade/components';
import {
  ImageUpload,
  ImageUploadAction,
  ImageUploadActions,
  ImageUploadDropzone,
  ImageUploadImage,
  ImageUploadPreview,
} from '@tryghost/shade/patterns';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { ACCEPTED_IMAGE_TYPES, UNSUPPORTED_IMAGE_MESSAGE } from '@/shared/images/image-upload';
import { UnsplashPicker, type UnsplashSelection } from './unsplash-picker';
import type { ImageFieldUpload } from './use-image-field-upload';

/** `bar` is the strip above the post title, `panel` the box a settings pane holds. */
const VARIANTS = {
  bar: {
    empty: 'h-14',
    dropzone:
      'group/dropzone border-transparent bg-transparent transition-colors hover:bg-interactive-hover',
    prompt: 'transition-colors group-hover/dropzone:text-foreground',
    unsplash: 'top-1/2 right-2 -translate-y-1/2',
  },
  panel: { empty: 'h-[120px]', dropzone: '', prompt: '', unsplash: '' },
};

export type ImageFieldVariant = keyof typeof VARIANTS;

export interface ImageFieldProps {
  src: string | null;
  /** Names the image in every label and in the upload failure, e.g. `X image`. */
  subject: string;
  /** The site's Unsplash setting: nothing is offered while it is off. */
  unsplashEnabled: boolean;
  /** Owned outside a conditionally rendered pane so pending uploads survive closing it. */
  upload: ImageFieldUpload;
  variant?: ImageFieldVariant;
  className?: string;
  testId?: string;
  /** A field with no alt text leaves its preview presentational. */
  alt?: string | null;
  /** Takes the uploaded or picked src, and `null` when the writer removes it. */
  onChange: (src: string | null) => void;
  /** Takes the photographer credit too. Defaults to `onChange` with the picked src. */
  onUnsplashSelect?: (picked: UnsplashSelection) => void;
  /** Sits under the preview, for whatever describes the image the field holds. */
  children?: ReactNode;
}

/**
 * An image the writer gives the post: uploaded from the file picker or a drop,
 * picked from Unsplash, previewed, and removed again.
 */
export function ImageField({
  src,
  subject,
  unsplashEnabled,
  upload,
  variant = 'panel',
  className,
  testId,
  alt = null,
  onChange,
  onUnsplashSelect,
  children,
}: ImageFieldProps) {
  const { isUploading, onUpload } = upload;
  const styles = VARIANTS[variant];
  const addLabel = `Add ${subject}`;

  if (!src) {
    return (
      <ImageUpload className={cn(styles.empty, className)} data-testid={testId}>
        <ImageUploadDropzone
          accept={ACCEPTED_IMAGE_TYPES}
          className={styles.dropzone}
          disabled={isUploading}
          inputAriaLabel={addLabel}
          noDragEventsBubbling
          onDropAccepted={(files) => files[0] && void onUpload(files[0])}
          onDropRejected={() => toast.error(UNSUPPORTED_IMAGE_MESSAGE)}
        >
          {isUploading ? (
            <LoadingIndicator size="sm" />
          ) : (
            <Inline gap="sm">
              <LucideIcon.Plus
                aria-hidden="true"
                className={cn('size-4 text-muted-foreground', styles.prompt)}
              />
              <span className={cn('text-sm text-muted-foreground', styles.prompt)}>{addLabel}</span>
            </Inline>
          )}
        </ImageUploadDropzone>
        <UnsplashPicker
          className={styles.unsplash}
          disabled={isUploading}
          enabled={unsplashEnabled}
          label={`Select ${subject} from Unsplash`}
          onSelect={(picked) =>
            onUnsplashSelect ? onUnsplashSelect(picked) : onChange(picked.src)
          }
        />
      </ImageUpload>
    );
  }

  const preview = (
    <ImageUploadPreview>
      <ImageUploadImage alt={alt ?? ''} role={alt ? 'img' : 'presentation'} src={src} />
      <ImageUploadActions>
        <ImageUploadAction aria-label={`Remove ${subject}`} onClick={() => onChange(null)}>
          <LucideIcon.Trash2 />
        </ImageUploadAction>
      </ImageUploadActions>
    </ImageUploadPreview>
  );

  if (!children) {
    return (
      <ImageUpload className={cn('max-h-[480px]', className)} data-testid={testId}>
        {preview}
      </ImageUpload>
    );
  }

  return (
    <Stack className={className} data-testid={testId} gap="sm">
      <ImageUpload className="max-h-[480px]">{preview}</ImageUpload>
      {children}
    </Stack>
  );
}
