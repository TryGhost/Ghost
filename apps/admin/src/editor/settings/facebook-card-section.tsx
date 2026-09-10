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
  facebookImageUnsplashButton,
  settingsFacebookDescriptionInput,
  settingsFacebookPreview,
  settingsFacebookPreviewImage,
  settingsFacebookTitleInput,
} from '@tryghost/test-data/selectors/editor';
import BrandIcon from '@/shared/brand-icon/brand-icon';
import {
  ACCEPTED_IMAGE_TYPES,
  UNSUPPORTED_IMAGE_MESSAGE,
  uploadErrorMessage,
} from '@/shared/images/image-upload';
import type { PostCardConfig } from '@/editor/card-config';
import {
  OG_DESCRIPTION_MAX,
  OG_DESCRIPTION_TOO_LONG,
  OG_TITLE_MAX,
  OG_TITLE_TOO_LONG,
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

const IMAGE_SUBJECT = 'Facebook image';
const ADD_IMAGE_LABEL = 'Add Facebook image';
const REMOVE_IMAGE_LABEL = 'Remove Facebook image';

export interface FacebookCardSectionProps {
  session: EditorSessionHandle;
  /** The site's homepage URL, which the card previews the post under. */
  siteUrl: string;
  /** The feature image the writer is looking at, which the card falls back to. */
  featureImage: string | null;
  /** Carries the site's own description and images, which the card falls back to last. */
  cardConfig: PostCardConfig;
}

/**
 * The card Facebook shows for the post: an image, title and description that
 * stand in for the post's own, and the result they produce.
 */
export function FacebookCardSection({
  session,
  siteUrl,
  featureImage,
  cardConfig,
}: FacebookCardSectionProps) {
  const titleId = useId();
  const titleErrorId = useId();
  const descriptionId = useId();
  const descriptionErrorId = useId();
  const { mutateAsync: uploadImage, isPending } = useUploadImage();

  const ogImage = session.settings.og_image ?? '';
  const ogTitle = session.settings.og_title ?? '';
  const ogDescription = session.settings.og_description ?? '';
  const titleError = overLength(ogTitle, OG_TITLE_MAX) ? OG_TITLE_TOO_LONG : null;
  const descriptionError = overLength(ogDescription, OG_DESCRIPTION_MAX)
    ? OG_DESCRIPTION_TOO_LONG
    : null;

  const previewTitle = socialTitle({
    own: ogTitle,
    metaTitle: session.settings.meta_title ?? '',
    title: session.bind.title,
  });
  const previewDescription = socialDescription({
    own: ogDescription,
    customExcerpt: session.settings.custom_excerpt ?? '',
    metaDescription: session.settings.meta_description ?? '',
    postExcerpt: session.loadedRecord?.excerpt ?? '',
    siteDescription: cardConfig.siteDescription,
  });
  const previewImage = socialImage({
    own: ogImage,
    featureImage: featureImage ?? '',
    siteSocialImage: cardConfig.siteOgImage ?? '',
    siteCoverImage: cardConfig.siteCoverImage ?? '',
  });

  const handleUpload = useCallback(
    async (file: File) => {
      try {
        session.editSettings({ og_image: getImageUrl(await uploadImage({ file })) });
      } catch (error) {
        toast.error(uploadErrorMessage(error, IMAGE_SUBJECT));
      }
    },
    [session, uploadImage],
  );

  return (
    <SettingsSubview
      closeLabel="Close Facebook card panel"
      icon={<BrandIcon className="size-4" name="facebook" />}
      id="facebook-card"
      label="Facebook card"
      title="Facebook card"
      wide
    >
      {ogImage ? (
        <ImageUpload className="max-h-[480px]">
          <ImageUploadPreview>
            <ImageUploadImage role="presentation" src={ogImage} />
            <ImageUploadActions>
              <ImageUploadAction
                aria-label={REMOVE_IMAGE_LABEL}
                onClick={() => session.editSettings({ og_image: null })}
              >
                <LucideIcon.Trash2 />
              </ImageUploadAction>
            </ImageUploadActions>
          </ImageUploadPreview>
        </ImageUpload>
      ) : (
        <ImageUpload className="h-[120px]">
          <ImageUploadDropzone
            accept={ACCEPTED_IMAGE_TYPES}
            disabled={isPending}
            inputAriaLabel={ADD_IMAGE_LABEL}
            noDragEventsBubbling
            onDropAccepted={(files) => files[0] && void handleUpload(files[0])}
            onDropRejected={() => toast.error(UNSUPPORTED_IMAGE_MESSAGE)}
          >
            {isPending ? (
              <LoadingIndicator size="sm" />
            ) : (
              <Inline gap="sm">
                <LucideIcon.Plus aria-hidden="true" className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{ADD_IMAGE_LABEL}</span>
              </Inline>
            )}
          </ImageUploadDropzone>
          <UnsplashPicker
            disabled={isPending}
            enabled={!!cardConfig.unsplash}
            label={facebookImageUnsplashButton}
            onSelect={({ src }) => session.editSettings({ og_image: src })}
          />
        </ImageUpload>
      )}

      <Stack gap="sm">
        <Label htmlFor={titleId}>Facebook title</Label>
        <Input
          aria-describedby={titleError ? titleErrorId : undefined}
          aria-invalid={!!titleError}
          data-testid={settingsFacebookTitleInput}
          id={titleId}
          placeholder={truncate(previewTitle, SOCIAL_TITLE_PLACEHOLDER_LENGTH)}
          value={ogTitle}
          onBlur={session.commitSettings}
          // A cleared field is stored as no value, the way the excerpt is.
          onChange={(event) => session.stageSettings({ og_title: event.target.value || null })}
        />
        {titleError ? <FieldError id={titleErrorId} message={titleError} /> : null}
      </Stack>

      <Stack gap="sm">
        <Label htmlFor={descriptionId}>Facebook description</Label>
        <Textarea
          aria-describedby={descriptionError ? descriptionErrorId : undefined}
          aria-invalid={!!descriptionError}
          data-testid={settingsFacebookDescriptionInput}
          id={descriptionId}
          placeholder={truncate(previewDescription, SOCIAL_DESCRIPTION_PLACEHOLDER_LENGTH)}
          rows={3}
          value={ogDescription}
          onBlur={session.commitSettings}
          onChange={(event) =>
            session.stageSettings({ og_description: event.target.value || null })
          }
        />
        {descriptionError ? (
          <FieldError id={descriptionErrorId} message={descriptionError} />
        ) : null}
      </Stack>

      <Stack gap="sm">
        <Text size="sm" weight="medium">
          Facebook preview
        </Text>
        <Stack
          className="overflow-hidden rounded-md border border-border"
          data-testid={settingsFacebookPreview}
          gap="none"
        >
          {previewImage ? (
            <img
              alt=""
              className="h-[220px] w-full object-cover"
              data-testid={settingsFacebookPreviewImage}
              src={previewImage}
            />
          ) : null}
          <Stack className="bg-surface-elevated p-4" gap="xs">
            <Text size="sm" tone="secondary">
              {siteDomain(siteUrl)}
            </Text>
            <Text size="md" weight="medium">
              {truncate(previewTitle, SOCIAL_PREVIEW_LENGTH)}
            </Text>
            <Text size="sm" tone="secondary">
              {truncate(previewDescription, SOCIAL_PREVIEW_LENGTH)}
            </Text>
          </Stack>
        </Stack>
      </Stack>
    </SettingsSubview>
  );
}
