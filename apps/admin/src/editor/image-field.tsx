import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { Button, FieldError } from '@tryghost/shade/components';
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
import { usePinturaEditor } from '@/hooks/use-pintura-editor';
import { ACCEPTED_IMAGE_TYPES, UNSUPPORTED_IMAGE_MESSAGE } from '@/shared/images/image-upload';
import { EDITOR_REQUEST_OPTIONS } from './request-options';
import { UnsplashPicker, type UnsplashSelection } from './unsplash-picker';
import type { ImageFieldUpload } from './use-image-field-upload';

/** `bar` is the strip above the post title, `panel` the box a settings pane holds. */
const VARIANTS = {
  bar: {
    empty: 'h-14',
    dropzone:
      'group/dropzone -ml-3 h-(--control-height) w-auto rounded-full border-0 bg-transparent px-3 py-2 shadow-none hover:bg-accent active:bg-accent active:shadow-control-pressed',
    prompt: 'transition-colors group-hover/dropzone:text-foreground',
    icon: LucideIcon.Plus,
    iconClassName: 'size-4',
    label: 'text-base font-medium',
    progress: 'w-40',
    unsplash: 'static',
  },
  panel: {
    empty: 'h-[120px]',
    dropzone:
      'group/dropzone border-dashed border-border-default bg-surface-elevated transition-colors',
    prompt: 'transition-colors group-hover/dropzone:text-foreground',
    icon: LucideIcon.Upload,
    iconClassName: 'size-6 stroke-[1.5px]',
    label: 'text-sm',
    progress: 'w-3/5',
    unsplash: '',
  },
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

function UploadProgress({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={value}
      className={cn('h-1.5 overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
    >
      <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
    </div>
  );
}

/**
 * An image the writer gives the post: uploaded from the file picker or a drop,
 * picked from Unsplash, previewed, edited in Pintura when the site has it, and
 * removed again.
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
  const { isUploading, progress, error, onUpload, retry, clearError } = upload;
  const editor = usePinturaEditor({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const busy = isUploading || editor.isOpen;
  const styles = VARIANTS[variant];
  const EmptyContainer = variant === 'bar' ? Inline : ImageUpload;
  const PromptContainer = variant === 'bar' ? Inline : Stack;
  const PromptIcon = styles.icon;
  const addLabel = `Add ${subject}`;
  const progressLabel = `Uploading ${subject}`;

  const pickFromUnsplash = (picked: UnsplashSelection) => {
    clearError();
    if (onUnsplashSelect) {
      onUnsplashSelect(picked);
    } else {
      onChange(picked.src);
    }
  };

  const remove = () => {
    clearError();
    onChange(null);
  };

  const field = !src ? (
    <EmptyContainer className={styles.empty} {...(variant === 'bar' ? { gap: 'sm' as const } : {})}>
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
          <UploadProgress className={styles.progress} label={progressLabel} value={progress} />
        ) : (
          <PromptContainer align="center" gap="sm">
            <PromptIcon
              aria-hidden="true"
              className={cn('text-muted-foreground', styles.iconClassName, styles.prompt)}
            />
            <span className={cn('text-muted-foreground', styles.prompt, styles.label)}>
              {addLabel}
            </span>
          </PromptContainer>
        )}
      </ImageUploadDropzone>
      <UnsplashPicker
        className={styles.unsplash}
        disabled={isUploading}
        enabled={unsplashEnabled}
        label={`Select ${subject} from Unsplash`}
        variant={variant === 'bar' ? 'inline' : 'overlay'}
        onSelect={pickFromUnsplash}
      />
    </EmptyContainer>
  ) : (
    <ImageUpload className={variant === 'panel' ? 'max-h-[480px]' : 'rounded-none'}>
      <ImageUploadPreview className={variant === 'bar' ? 'rounded-none' : undefined}>
        <ImageUploadImage alt={alt ?? ''} role={alt ? 'img' : 'presentation'} src={src} />
        {isUploading ? (
          <Inline align="center" className="absolute inset-0 bg-background/60" justify="center">
            <UploadProgress className="w-3/5" label={progressLabel} value={progress} />
          </Inline>
        ) : null}
        <ImageUploadActions>
          {editor.isEnabled && (
            <ImageUploadAction
              aria-label={`Edit ${subject}`}
              disabled={busy}
              onClick={() => editor.openEditor({ image: src, handleSave: onUpload })}
            >
              <LucideIcon.Pencil />
            </ImageUploadAction>
          )}
          <ImageUploadAction aria-label={`Remove ${subject}`} disabled={busy} onClick={remove}>
            <LucideIcon.Trash2 />
          </ImageUploadAction>
        </ImageUploadActions>
      </ImageUploadPreview>
    </ImageUpload>
  );

  return (
    <Stack className={className} data-testid={testId} gap="sm">
      {field}
      {error ? (
        <Inline gap="sm" wrap>
          <FieldError>{error}</FieldError>
          <Button size="sm" variant="outline" onClick={retry}>
            Try again
          </Button>
        </Inline>
      ) : null}
      {src ? children : null}
    </Stack>
  );
}
