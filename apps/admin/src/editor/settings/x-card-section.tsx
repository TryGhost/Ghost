import { useCallback, useId } from 'react';
import { toast } from 'sonner';
import { Input, Label, LoadingIndicator, Textarea, XLogo } from '@tryghost/shade/components';
import {
  ImageUpload,
  ImageUploadAction,
  ImageUploadActions,
  ImageUploadDropzone,
  ImageUploadImage,
  ImageUploadPreview,
} from '@tryghost/shade/patterns';
import { Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { getImageUrl, useUploadImage } from '@tryghost/admin-x-framework/api/images';
import {
  JSONError,
  RequestEntityTooLargeError,
  UnsupportedMediaTypeError,
} from '@tryghost/admin-x-framework/errors';
import {
  addXImageLabel,
  removeXImageButton,
  settingsXDescriptionInput,
  settingsXImage,
  settingsXPreview,
  settingsXPreviewImage,
  settingsXTitleInput,
} from '@tryghost/test-data/selectors/editor';
import type { PostCardConfig } from '@/editor/card-config';
import {
  X_DESCRIPTION_MAX,
  X_DESCRIPTION_TOO_LONG,
  X_TITLE_MAX,
  X_TITLE_TOO_LONG,
  overLength,
} from '@/editor/session/settings-fields';
import type { EditorSessionHandle } from '@/editor/session/use-editor-session';
import { siteDomain } from './facebook-card-fields';
import { SettingsSubview } from './settings-subview';
import {
  xCardDescription,
  xCardImage,
  xCardTitle,
  xDescriptionPlaceholder,
  xPreviewDescription,
  xTitlePlaceholder,
} from './x-card-fields';

const ACCEPTED_IMAGE_TYPES = {
  'image/gif': ['.gif'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/svg+xml': ['.svg', '.svgz'],
  'image/webp': ['.webp'],
};

const UNSUPPORTED_IMAGE_MESSAGE =
  'The image type you uploaded is not supported. Please use .GIF, .JPG, .JPEG, .PNG, .SVG, .SVGZ, .WEBP';

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
  return 'Couldn’t upload the X image.';
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <Text className="text-red" id={id} role="alert" size="sm">
      {message}
    </Text>
  );
}

export interface XCardSectionProps {
  session: EditorSessionHandle;
  /** The site's homepage URL, which the card previews the post under. */
  siteUrl: string;
  /** The feature image the writer is looking at, which the card falls back to. */
  featureImage: string | null;
  /** Carries the site's own description and images, which the card falls back to last. */
  cardConfig: PostCardConfig;
}

/**
 * The card X renders for the post: an image, a title and a description that
 * stand in for the post's own, and the result they produce.
 */
export function XCardSection({ session, siteUrl, featureImage, cardConfig }: XCardSectionProps) {
  const titleId = useId();
  const titleErrorId = useId();
  const descriptionId = useId();
  const descriptionErrorId = useId();
  const { mutateAsync: uploadImage, isPending } = useUploadImage();

  const twitterImage = session.settings.twitter_image ?? '';
  const twitterTitle = session.settings.twitter_title ?? '';
  const twitterDescription = session.settings.twitter_description ?? '';
  const titleError = overLength(twitterTitle, X_TITLE_MAX) ? X_TITLE_TOO_LONG : null;
  const descriptionError = overLength(twitterDescription, X_DESCRIPTION_MAX)
    ? X_DESCRIPTION_TOO_LONG
    : null;

  const previewTitle = xCardTitle({
    twitterTitle,
    metaTitle: session.settings.meta_title ?? '',
    title: session.bind.title,
  });
  const previewDescription = xCardDescription({
    twitterDescription,
    customExcerpt: session.settings.custom_excerpt ?? '',
    metaDescription: session.settings.meta_description ?? '',
    postExcerpt: session.loadedRecord?.excerpt ?? '',
    siteDescription: cardConfig.siteDescription,
  });
  const previewImage = xCardImage({
    twitterImage,
    featureImage: featureImage ?? '',
    siteTwitterImage: cardConfig.siteTwitterImage ?? '',
    siteCoverImage: cardConfig.siteCoverImage ?? '',
  });

  const handleUpload = useCallback(
    async (file: File) => {
      try {
        session.editSettings({ twitter_image: getImageUrl(await uploadImage({ file })) });
      } catch (error) {
        toast.error(uploadErrorMessage(error));
      }
    },
    [session, uploadImage],
  );

  return (
    <SettingsSubview
      closeLabel="Close X card panel"
      icon={<XLogo />}
      id="x-card"
      label="X card"
      title="X card"
      wide
    >
      <ImageUpload className="h-40" data-testid={settingsXImage}>
        {twitterImage ? (
          <ImageUploadPreview>
            <ImageUploadImage alt="" src={twitterImage} />
            <ImageUploadActions>
              <ImageUploadAction
                aria-label={removeXImageButton}
                onClick={() => session.editSettings({ twitter_image: null })}
              >
                <LucideIcon.Trash2 />
              </ImageUploadAction>
            </ImageUploadActions>
          </ImageUploadPreview>
        ) : (
          <ImageUploadDropzone
            accept={ACCEPTED_IMAGE_TYPES}
            className="group/dropzone transition-colors hover:bg-interactive-hover"
            disabled={isPending}
            inputAriaLabel={addXImageLabel}
            noDragEventsBubbling
            onDropAccepted={(files) => files[0] && void handleUpload(files[0])}
            onDropRejected={() => toast.error(UNSUPPORTED_IMAGE_MESSAGE)}
          >
            {isPending ? (
              <LoadingIndicator size="sm" />
            ) : (
              <Stack align="center" gap="sm">
                <LucideIcon.Upload
                  aria-hidden="true"
                  className="size-6 stroke-[1.5px] text-muted-foreground transition-colors group-hover/dropzone:text-foreground"
                />
                <span className="text-sm text-muted-foreground transition-colors group-hover/dropzone:text-foreground">
                  {addXImageLabel}
                </span>
              </Stack>
            )}
          </ImageUploadDropzone>
        )}
      </ImageUpload>

      <Stack gap="sm">
        <Label htmlFor={titleId}>X title</Label>
        <Input
          aria-describedby={titleError ? titleErrorId : undefined}
          aria-invalid={!!titleError}
          data-testid={settingsXTitleInput}
          id={titleId}
          placeholder={xTitlePlaceholder(previewTitle)}
          value={twitterTitle}
          onBlur={session.commitSettings}
          // A cleared field is stored as no value, the way the excerpt is.
          onChange={(event) => session.stageSettings({ twitter_title: event.target.value || null })}
        />
        {titleError ? <FieldError id={titleErrorId} message={titleError} /> : null}
      </Stack>

      <Stack gap="sm">
        <Label htmlFor={descriptionId}>X description</Label>
        <Textarea
          aria-describedby={descriptionError ? descriptionErrorId : undefined}
          aria-invalid={!!descriptionError}
          data-testid={settingsXDescriptionInput}
          id={descriptionId}
          placeholder={xDescriptionPlaceholder(previewDescription)}
          rows={3}
          value={twitterDescription}
          onBlur={session.commitSettings}
          onChange={(event) =>
            session.stageSettings({ twitter_description: event.target.value || null })
          }
        />
        {descriptionError ? (
          <FieldError id={descriptionErrorId} message={descriptionError} />
        ) : null}
      </Stack>

      <Stack gap="sm">
        <Text size="sm" weight="medium">
          X preview
        </Text>
        <Stack
          className="overflow-hidden rounded-md border border-border"
          data-testid={settingsXPreview}
          gap="none"
        >
          {previewImage ? (
            <img
              alt=""
              className="h-[220px] w-full object-cover"
              data-testid={settingsXPreviewImage}
              src={previewImage}
            />
          ) : null}
          <Stack className="bg-surface-elevated p-4" gap="xs">
            <Text size="md" weight="medium">
              {previewTitle}
            </Text>
            <Text size="sm" tone="secondary">
              {xPreviewDescription(previewDescription)}
            </Text>
            <Text size="sm" tone="secondary">
              {siteDomain(siteUrl)}
            </Text>
          </Stack>
        </Stack>
      </Stack>
    </SettingsSubview>
  );
}
