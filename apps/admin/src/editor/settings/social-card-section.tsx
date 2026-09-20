import { useCallback } from 'react';
import { Field, FieldError, FieldLabel, Input, Textarea } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import BrandIcon from '@/shared/brand-icon/brand-icon';
import type { PostCardConfig } from '@/editor/card-config';
import { ImageField } from '@/editor/image-field';
import { useImageFieldUpload } from '@/editor/use-image-field-upload';
import type { EditorSettingsPort } from './editor-settings-port';
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
  session: EditorSettingsPort;
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
  const title = useSettingsField(session, network.titleKey);
  const description = useSettingsField(session, network.descriptionKey);
  const image = session.settings[network.imageKey] ?? '';

  const imageSubject = `${network.name} image`;

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
  const upload = useImageFieldUpload(imageSubject, editImage);

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
      <ImageField
        src={image || null}
        subject={imageSubject}
        testId={network.imageTestId}
        unsplashEnabled={!!cardConfig.unsplash}
        upload={upload}
        onChange={editImage}
      />

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
