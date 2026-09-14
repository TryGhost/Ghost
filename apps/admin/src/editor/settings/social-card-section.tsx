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
import type { SocialCardNetwork, SocialPreviewRow } from './social-card-networks';
import { useSettingsField } from './use-settings-field';

export interface SocialCardSectionProps {
  /** Which network's card this pane edits (see `social-card-networks.ts`). */
  network: SocialCardNetwork;
  session: EditorSessionHandle;
  /** The site's homepage URL, which the card previews the post under. */
  siteUrl: string;
  /** The feature image the writer is looking at, which the card falls back to. */
  featureImage: string | null;
  /** Carries the site's own description and images, which the card falls back to last. */
  cardConfig: PostCardConfig;
}

/**
 * The card a network renders for the post: an image, a title and a description
 * that stand in for the post's own, and the result they produce.
 */
export function SocialCardSection({
  network,
  session,
  siteUrl,
  featureImage,
  cardConfig,
}: SocialCardSectionProps) {
  const { mutateAsync: uploadImage, isPending } = useUploadImage();

  const title = useSettingsField(session, network.titleKey);
  const description = useSettingsField(session, network.descriptionKey);
  const image = session.settings[network.imageKey] ?? '';

  const imageSubject = `${network.name} image`;
  const addImageLabel = `Add ${imageSubject}`;

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
    own: image,
    featureImage: featureImage ?? '',
    siteSocialImage: cardConfig[network.siteImageKey] ?? '',
    siteCoverImage: cardConfig.siteCoverImage ?? '',
  });

  const editImage = useCallback(
    (src: string | null) => session.editSettings({ [network.imageKey]: src }),
    [network.imageKey, session],
  );

  const handleUpload = useCallback(
    async (file: File) => {
      try {
        editImage(getImageUrl(await uploadImage({ file, ...EDITOR_REQUEST_OPTIONS })));
      } catch (error) {
        toast.error(uploadErrorMessage(error, imageSubject));
      }
    },
    [editImage, imageSubject, uploadImage],
  );

  const previewRow = (row: SocialPreviewRow) => {
    if (row === 'title') {
      return (
        <Text key={row} size="md" weight="medium">
          {network.truncatesPreviewTitle
            ? truncate(previewTitle, SOCIAL_PREVIEW_LENGTH)
            : previewTitle}
        </Text>
      );
    }

    if (row === 'description') {
      return (
        <Text key={row} size="sm" tone="secondary">
          {truncate(previewDescription, SOCIAL_PREVIEW_LENGTH)}
        </Text>
      );
    }

    return (
      <Text key={row} size="sm" tone="secondary">
        {siteDomain(siteUrl)}
      </Text>
    );
  };

  return (
    <SettingsSubview
      closeLabel={`Close ${network.name} card panel`}
      icon={<BrandIcon className="size-4" name={network.icon} />}
      id={network.id}
      label={`${network.name} card`}
      title={`${network.name} card`}
      wide
    >
      {image ? (
        <ImageUpload className="max-h-[480px]" data-testid={network.imageTestId}>
          <ImageUploadPreview>
            <ImageUploadImage role="presentation" src={image} />
            <ImageUploadActions>
              <ImageUploadAction
                aria-label={`Remove ${imageSubject}`}
                onClick={() => editImage(null)}
              >
                <LucideIcon.Trash2 />
              </ImageUploadAction>
            </ImageUploadActions>
          </ImageUploadPreview>
        </ImageUpload>
      ) : (
        <ImageUpload className="h-[120px]" data-testid={network.imageTestId}>
          <ImageUploadDropzone
            accept={ACCEPTED_IMAGE_TYPES}
            disabled={isPending}
            inputAriaLabel={addImageLabel}
            noDragEventsBubbling
            onDropAccepted={(files) => files[0] && void handleUpload(files[0])}
            onDropRejected={() => toast.error(UNSUPPORTED_IMAGE_MESSAGE)}
          >
            {isPending ? (
              <LoadingIndicator size="sm" />
            ) : (
              <Inline gap="sm">
                <LucideIcon.Plus aria-hidden="true" className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{addImageLabel}</span>
              </Inline>
            )}
          </ImageUploadDropzone>
          <UnsplashPicker
            disabled={isPending}
            enabled={!!cardConfig.unsplash}
            label={`Select ${imageSubject} from Unsplash`}
            onSelect={({ src }) => editImage(src)}
          />
        </ImageUpload>
      )}

      <Field>
        <FieldLabel htmlFor={title.fieldProps.id}>{network.name} title</FieldLabel>
        <Input
          data-testid={network.titleTestId}
          placeholder={truncate(previewTitle, SOCIAL_TITLE_PLACEHOLDER_LENGTH)}
          {...title.fieldProps}
        />
        <FieldError {...title.errorProps}>{title.error}</FieldError>
      </Field>

      <Field>
        <FieldLabel htmlFor={description.fieldProps.id}>{network.name} description</FieldLabel>
        <Textarea
          data-testid={network.descriptionTestId}
          placeholder={truncate(previewDescription, SOCIAL_DESCRIPTION_PLACEHOLDER_LENGTH)}
          rows={3}
          {...description.fieldProps}
        />
        <FieldError {...description.errorProps}>{description.error}</FieldError>
      </Field>

      <Stack gap="sm">
        <Text size="sm" weight="medium">
          {network.name} preview
        </Text>
        <Stack
          className="overflow-hidden rounded-md border border-border"
          data-testid={network.previewTestId}
          gap="none"
        >
          {previewImage ? (
            <img
              alt=""
              className="h-[220px] w-full object-cover"
              data-testid={network.previewImageTestId}
              src={previewImage}
            />
          ) : null}
          <Stack className="bg-surface-elevated p-4" gap="xs">
            {network.previewRows.map(previewRow)}
          </Stack>
        </Stack>
      </Stack>
    </SettingsSubview>
  );
}
