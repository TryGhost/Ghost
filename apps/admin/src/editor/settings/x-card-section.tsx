import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  Field,
  FieldError,
  FieldLabel,
  Input,
  LoadingIndicator,
  Textarea,
} from '@tryghost/shade/components';
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
  settingsXDescriptionInput,
  settingsXImage,
  settingsXPreview,
  settingsXPreviewImage,
  settingsXTitleInput,
} from '@tryghost/test-data/selectors/editor';
import BrandIcon from '@/shared/brand-icon/brand-icon';
import {
  ACCEPTED_IMAGE_TYPES,
  UNSUPPORTED_IMAGE_MESSAGE,
  uploadErrorMessage,
} from '@/shared/images/image-upload';
import type { PostCardConfig } from '@/editor/card-config';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import type { EditorSessionHandle } from '@/editor/session/use-editor-session';
import { UnsplashPicker } from '@/editor/unsplash-picker';
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
import { useSettingsField } from './use-settings-field';

const IMAGE_SUBJECT = 'X image';
const ADD_IMAGE_LABEL = 'Add X image';
const REMOVE_IMAGE_LABEL = 'Remove X image';
const UNSPLASH_BUTTON_LABEL = 'Select X image from Unsplash';

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
  const { mutateAsync: uploadImage, isPending } = useUploadImage();

  const title = useSettingsField(session, 'twitter_title');
  const description = useSettingsField(session, 'twitter_description');
  const twitterImage = session.settings.twitter_image ?? '';

  const previewTitle = socialTitle({
    own: title.value,
    metaTitle: session.settings.meta_title ?? '',
    title: session.bind.title,
  });
  const previewDescription = socialDescription({
    own: description.value,
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
        session.editSettings({
          twitter_image: getImageUrl(await uploadImage({ file, ...EDITOR_REQUEST_OPTIONS })),
        });
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
                aria-label={REMOVE_IMAGE_LABEL}
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
            label={UNSPLASH_BUTTON_LABEL}
            onSelect={({ src }) => session.editSettings({ twitter_image: src })}
          />
        </ImageUpload>
      )}

      <Field>
        <FieldLabel htmlFor={title.fieldProps.id}>X title</FieldLabel>
        <Input
          data-testid={settingsXTitleInput}
          placeholder={truncate(previewTitle, SOCIAL_TITLE_PLACEHOLDER_LENGTH)}
          {...title.fieldProps}
        />
        <FieldError {...title.errorProps}>{title.error}</FieldError>
      </Field>

      <Field>
        <FieldLabel htmlFor={description.fieldProps.id}>X description</FieldLabel>
        <Textarea
          data-testid={settingsXDescriptionInput}
          placeholder={truncate(previewDescription, SOCIAL_DESCRIPTION_PLACEHOLDER_LENGTH)}
          rows={3}
          {...description.fieldProps}
        />
        <FieldError {...description.errorProps}>{description.error}</FieldError>
      </Field>

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
