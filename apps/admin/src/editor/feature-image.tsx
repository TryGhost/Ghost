import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { UnsplashSearchModal } from '@tryghost/kg-unsplash-selector';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
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
import { getImageUrl, useUploadImage } from '@tryghost/admin-x-framework/api/images';
import { useFramework } from '@tryghost/admin-x-framework';
import {
  JSONError,
  RequestEntityTooLargeError,
  UnsupportedMediaTypeError,
} from '@tryghost/admin-x-framework/errors';
import BrandIcon from '@/shared/brand-icon/brand-icon';
import type { KoenigInstance } from '@/settings/components/koenig-loader';
import type { PostCardConfig } from './card-config';
import { FeatureImageCaption } from './feature-image-caption';

const ACCEPTED_IMAGE_TYPES = {
  'image/gif': ['.gif'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/svg+xml': ['.svg', '.svgz'],
  'image/webp': ['.webp'],
};

const UNSUPPORTED_IMAGE_MESSAGE =
  'The image type you uploaded is not supported. Please use .GIF, .JPG, .JPEG, .PNG, .SVG, .SVGZ, .WEBP';

const ALT_MAX_LENGTH = 191;

function uploadErrorMessage(error: unknown): string {
  if (error instanceof UnsupportedMediaTypeError) {
    return UNSUPPORTED_IMAGE_MESSAGE;
  }
  if (error instanceof RequestEntityTooLargeError) {
    return 'The image you uploaded was larger than the maximum file size your server allows.';
  }
  if (error instanceof JSONError && error.data?.errors[0]?.message) {
    return error.data.errors[0].message;
  }
  return 'Couldn’t upload the feature image.';
}

export interface FeatureImageProps {
  image: string | null;
  alt: string | null;
  /** Paragraph-wrapped caption HTML. */
  caption: string | null;
  cardConfig: PostCardConfig;
  darkMode: boolean;
  onImageChange: (url: string) => void;
  onImageClear: () => void;
  onAltChange: (alt: string) => void;
  onCaptionChange: (html: string) => void;
  onCaptionBlur: () => void;
  onTkCountChange: (count: number) => void;
}

/**
 * The post's feature image: uploaded from the file picker or a drop, picked
 * from Unsplash, and described by either alt text or a caption.
 */
export function FeatureImage({
  image,
  alt,
  caption,
  cardConfig,
  darkMode,
  onImageChange,
  onImageClear,
  onAltChange,
  onCaptionChange,
  onCaptionBlur,
  onTkCountChange,
}: FeatureImageProps) {
  const { mutateAsync: uploadImage, isPending } = useUploadImage();
  const { unsplashConfig } = useFramework();
  const [showUnsplash, setShowUnsplash] = useState(false);
  const [isEditingAlt, setIsEditingAlt] = useState(false);
  const [captionFocused, setCaptionFocused] = useState(false);
  const [captionTkCount, setCaptionTkCount] = useState(0);
  const captionApi = useRef<KoenigInstance | null>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      try {
        onImageChange(getImageUrl(await uploadImage({ file })));
      } catch (error) {
        toast.error(uploadErrorMessage(error));
      }
    },
    [uploadImage, onImageChange],
  );

  const relayTkCount = useCallback(
    (count: number) => {
      setCaptionTkCount(count);
      onTkCountChange(count);
    },
    [onTkCountChange],
  );

  // A new identity re-registers the caption editor on every keystroke
  const registerCaptionApi = useCallback((api: KoenigInstance | null) => {
    captionApi.current = api;
  }, []);

  const focusCaption = useCallback(() => {
    captionApi.current?.focusEditor({ position: 'bottom' });
  }, []);

  const onCaptionFocus = useCallback(() => setCaptionFocused(true), []);

  const onCaptionBlurred = useCallback(() => {
    setCaptionFocused(false);
    onCaptionBlur();
  }, [onCaptionBlur]);

  const clearImage = () => {
    setIsEditingAlt(false);
    relayTkCount(0);
    onImageClear();
  };

  if (!image) {
    return (
      <ImageUpload className="mb-4 h-14" data-testid="editor-feature-image">
        <ImageUploadDropzone
          accept={ACCEPTED_IMAGE_TYPES}
          className="group/dropzone border-transparent bg-transparent transition-colors hover:bg-interactive-hover"
          disabled={isPending}
          inputAriaLabel="Add feature image"
          onDropAccepted={(files) => files[0] && void handleUpload(files[0])}
          onDropRejected={() => toast.error(UNSUPPORTED_IMAGE_MESSAGE)}
        >
          {isPending ? (
            <LoadingIndicator size="sm" />
          ) : (
            <Inline gap="sm">
              <LucideIcon.Plus
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-colors group-hover/dropzone:text-foreground"
              />
              <span className="text-sm text-muted-foreground transition-colors group-hover/dropzone:text-foreground">
                Add feature image
              </span>
            </Inline>
          )}
        </ImageUploadDropzone>
        {cardConfig.unsplash && (
          <ImageUploadActions className="top-1/2 right-2 -translate-y-1/2 opacity-100">
            <Button
              aria-label="Select feature image from Unsplash"
              className="group/unsplash hover:bg-button-hover"
              disabled={isPending}
              size="icon"
              type="button"
              variant="ghost"
              onClick={() => setShowUnsplash(true)}
            >
              <BrandIcon
                className="size-4 text-muted-foreground transition-colors group-hover/unsplash:text-foreground"
                name="unsplash"
              />
            </Button>
          </ImageUploadActions>
        )}
        {showUnsplash &&
          createPortal(
            <UnsplashSearchModal
              unsplashProviderConfig={unsplashConfig}
              onClose={() => setShowUnsplash(false)}
              onImageInsert={(inserted) => {
                if (inserted.src) {
                  onImageChange(inserted.src);
                  onCaptionChange(inserted.caption ?? '');
                }
                setShowUnsplash(false);
              }}
            />,
            document.body,
          )}
      </ImageUpload>
    );
  }

  return (
    <Stack className="mb-4" data-testid="editor-feature-image" gap="sm">
      <ImageUpload className="max-h-[480px]">
        <ImageUploadPreview>
          <ImageUploadImage alt={alt ?? ''} role={alt ? 'img' : 'presentation'} src={image} />
          <ImageUploadActions>
            <ImageUploadAction aria-label="Remove feature image" onClick={clearImage}>
              <LucideIcon.Trash2 />
            </ImageUploadAction>
          </ImageUploadActions>
        </ImageUploadPreview>
      </ImageUpload>
      <Inline align="center" className="relative" gap="sm">
        {isEditingAlt ? (
          <input
            aria-label="Alt text for feature image"
            className="flex-1 border-0 bg-transparent p-0 text-sm text-text-secondary outline-none placeholder:text-muted-foreground"
            maxLength={ALT_MAX_LENGTH}
            name="alt"
            placeholder="Add alt text to the feature image"
            type="text"
            value={alt ?? ''}
            autoFocus
            onChange={(event) => onAltChange(event.target.value)}
          />
        ) : (
          <div className="flex-1 text-sm" data-testid="editor-feature-image-caption">
            <FeatureImageCaption
              darkMode={darkMode}
              html={caption}
              placeholder={captionFocused ? '' : 'Add a caption to the feature image'}
              registerAPI={registerCaptionApi}
              searchLinks={cardConfig.searchLinks}
              onBlur={onCaptionBlurred}
              onChangeHtml={onCaptionChange}
              onFocus={onCaptionFocus}
              onTkCountChange={relayTkCount}
            />
          </div>
        )}
        {captionTkCount > 0 && !isEditingAlt && (
          <button
            className="rounded-sm bg-state-warning px-1.5 py-0.5 text-2xs font-bold text-foreground"
            data-testid="feature-image-tk-indicator"
            type="button"
            onClick={focusCaption}
          >
            TK
          </button>
        )}
        <button
          aria-label="Toggle between editing alt text and caption"
          className={cn(
            'rounded-md border px-1.5 py-0.5 text-2xs font-medium tracking-wide',
            isEditingAlt
              ? 'border-state-success bg-state-success text-state-success-foreground'
              : 'border-border-default bg-transparent text-text-tertiary',
          )}
          type="button"
          onClick={() => setIsEditingAlt(!isEditingAlt)}
        >
          Alt
        </button>
      </Inline>
    </Stack>
  );
}
