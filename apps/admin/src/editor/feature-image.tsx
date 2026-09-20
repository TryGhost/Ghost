import { useCallback, useRef, useState } from 'react';
import { Inline } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import {
  editorFeatureImage,
  editorFeatureImageCaption,
  featureImageTkIndicator,
} from '@tryghost/test-data/selectors/editor';
import type { KoenigInstance } from '@/settings/components/koenig-loader';
import type { PostCardConfig } from './card-config';
import { FeatureImageCaption } from './feature-image-caption';
import { ImageField } from './image-field';
import type { UnsplashSelection } from './unsplash-picker';
import { useImageFieldUpload } from './use-image-field-upload';

const ALT_MAX_LENGTH = 191;
const IMAGE_SUBJECT = 'feature image';

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
  const [isEditingAlt, setIsEditingAlt] = useState(false);
  const [captionFocused, setCaptionFocused] = useState(false);
  const [captionTkCount, setCaptionTkCount] = useState(0);
  const captionApi = useRef<KoenigInstance | null>(null);

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

  const changeImage = useCallback(
    (src: string | null) => {
      if (src === null) {
        setIsEditingAlt(false);
        relayTkCount(0);
        onImageClear();
        return;
      }
      onImageChange(src);
    },
    [onImageChange, onImageClear, relayTkCount],
  );

  const upload = useImageFieldUpload(IMAGE_SUBJECT, changeImage);

  const pickFromUnsplash = useCallback(
    (picked: UnsplashSelection) => {
      onImageChange(picked.src);
      onCaptionChange(picked.caption);
    },
    [onCaptionChange, onImageChange],
  );

  return (
    <ImageField
      alt={alt}
      className="mb-4"
      src={image}
      subject={IMAGE_SUBJECT}
      testId={editorFeatureImage}
      unsplashEnabled={!!cardConfig.unsplash}
      upload={upload}
      variant="bar"
      onChange={changeImage}
      onUnsplashSelect={pickFromUnsplash}
    >
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
          <div className="flex-1 text-sm" data-testid={editorFeatureImageCaption}>
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
            data-testid={featureImageTkIndicator}
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
    </ImageField>
  );
}
