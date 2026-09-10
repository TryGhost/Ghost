import { useCallback, useId } from 'react';
import { toast } from 'sonner';
import { Input, Label, LoadingIndicator, Textarea } from '@tryghost/shade/components';
import {
  ImageUpload,
  ImageUploadAction,
  ImageUploadActions,
  ImageUploadDropzone,
  ImageUploadImage,
  ImageUploadPreview,
} from '@tryghost/shade/patterns';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { getImageUrl, useUploadImage } from '@tryghost/admin-x-framework/api/images';
import {
  addXImageLabel,
  removeXImageButton,
  settingsXDescriptionInput,
  settingsXImage,
  settingsXPreview,
  settingsXPreviewImage,
  settingsXTitleInput,
  xImageUnsplashButton,
} from '@tryghost/test-data/selectors/editor';
import BrandIcon from '@/shared/brand-icon/brand-icon';
import {
  ACCEPTED_IMAGE_TYPES,
  UNSUPPORTED_IMAGE_MESSAGE,
  uploadErrorMessage,
} from '@/shared/images/image-upload';
import type { PostCardConfig } from '@/editor/card-config';
import {
  X_DESCRIPTION_MAX,
  X_DESCRIPTION_TOO_LONG,
  X_TITLE_MAX,
  X_TITLE_TOO_LONG,
  overLength,
} from '@/editor/session/settings-fields';
import type { EditorSessionHandle } from '@/editor/session/use-editor-session';
import { UnsplashPicker } from '@/editor/unsplash-picker';
import { FieldError } from './field-error';
import { truncate } from './meta-data-fields';
import { SettingsSubview } from './settings-subview';
import {
  SOCIAL_DESCRIPTION_PLACEHOLDER_LENGTH,
  SOCIAL_PREVIEW_LENGTH,
  SOCIAL_TITLE_PLACEHOLDER_LENGTH,
  siteDomain,
  socialDescription,
  socialImage,
  socialTitle,
} from './social-card-fields';

const IMAGE_SUBJECT = 'X image';

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

  const previewTitle = socialTitle({
    own: twitterTitle,
    metaTitle: session.settings.meta_title ?? '',
    title: session.bind.title,
  });
  const previewDescription = socialDescription({
    own: twitterDescription,
    customExcerpt: session.settings.custom_excerpt ?? '',
    metaDescription: session.settings.meta_description ?? '',
    postExcerpt: session.loadedRecord?.excerpt ?? '',
    siteDescription: cardConfig.siteDescription,
  });
  const previewImage = socialImage({
    own: twitterImage,
    featureImage: featureImage ?? '',
    siteSocialImage: cardConfig.siteTwitterImage ?? '',
    siteCoverImage: cardConfig.siteCoverImage ?? '',
  });

  const handleUpload = useCallback(
    async (file: File) => {
      try {
        session.editSettings({ twitter_image: getImageUrl(await uploadImage({ file })) });
      } catch (error) {
        toast.error(uploadErrorMessage(error, IMAGE_SUBJECT));
      }
    },
    [session, uploadImage],
  );

  return (
    <SettingsSubview
      closeLabel="Close X card panel"
      icon={<BrandIcon className="size-4" name="twitter-x" />}
      id="x-card"
      label="X card"
      title="X card"
      wide
    >
      {twitterImage ? (
        <ImageUpload className="max-h-[480px]" data-testid={settingsXImage}>
          <ImageUploadPreview>
            <ImageUploadImage role="presentation" src={twitterImage} />
            <ImageUploadActions>
              <ImageUploadAction
                aria-label={removeXImageButton}
                onClick={() => session.editSettings({ twitter_image: null })}
              >
                <LucideIcon.Trash2 />
              </ImageUploadAction>
            </ImageUploadActions>
          </ImageUploadPreview>
        </ImageUpload>
      ) : (
        <ImageUpload className="h-[120px]" data-testid={settingsXImage}>
          <ImageUploadDropzone
            accept={ACCEPTED_IMAGE_TYPES}
            disabled={isPending}
            inputAriaLabel={addXImageLabel}
            noDragEventsBubbling
            onDropAccepted={(files) => files[0] && void handleUpload(files[0])}
            onDropRejected={() => toast.error(UNSUPPORTED_IMAGE_MESSAGE)}
          >
            {isPending ? (
              <LoadingIndicator size="sm" />
            ) : (
              <Inline gap="sm">
                <LucideIcon.Plus aria-hidden="true" className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{addXImageLabel}</span>
              </Inline>
            )}
          </ImageUploadDropzone>
          <UnsplashPicker
            disabled={isPending}
            enabled={!!cardConfig.unsplash}
            label={xImageUnsplashButton}
            onSelect={({ src }) => session.editSettings({ twitter_image: src })}
          />
        </ImageUpload>
      )}

      <Stack gap="sm">
        <Label htmlFor={titleId}>X title</Label>
        <Input
          aria-describedby={titleError ? titleErrorId : undefined}
          aria-invalid={!!titleError}
          data-testid={settingsXTitleInput}
          id={titleId}
          placeholder={truncate(previewTitle, SOCIAL_TITLE_PLACEHOLDER_LENGTH)}
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
          placeholder={truncate(previewDescription, SOCIAL_DESCRIPTION_PLACEHOLDER_LENGTH)}
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
              {truncate(previewDescription, SOCIAL_PREVIEW_LENGTH)}
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
