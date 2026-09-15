import { useId } from 'react';
import { Field, FieldError, FieldLabel, Input, Textarea } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn, formatNumber } from '@tryghost/shade/utils';
import {
  settingsMetaDescriptionInput,
  settingsMetaTitleInput,
  settingsSerpPreview,
} from '@tryghost/test-data/selectors/editor';
import type { EditorSessionHandle } from '@/editor/session/use-editor-session';
import {
  META_DESCRIPTION_RECOMMENDED,
  META_TITLE_RECOMMENDED,
  characterCount,
  metaDescriptionPlaceholder,
  seoDescription,
  seoTitle,
  seoUrl,
  serpDate,
  serpDescription,
  serpTitle,
} from './meta-data-fields';
import { SettingsSubview } from './settings-subview';
import { useSettingsField } from './use-settings-field';

function Countdown({ id, value, recommended }: { id: string; value: string; recommended: number }) {
  const used = characterCount(value);

  return (
    <Text id={id} size="sm" tone="secondary">
      Recommended: <b>{formatNumber(recommended)}</b> characters. You&apos;ve used{' '}
      <span
        className={cn('font-bold', used > recommended ? 'text-destructive' : 'text-state-success')}
      >
        {formatNumber(used)}
      </span>
    </Text>
  );
}

function SearchPreview({
  url,
  title,
  description,
}: {
  url: string;
  title: string;
  description: string;
}) {
  return (
    <Stack
      className="rounded-md border border-border p-4"
      data-testid={settingsSerpPreview}
      gap="xs"
    >
      <Text size="sm" tone="secondary">
        {url}
      </Text>
      <Text size="md" weight="medium">
        {serpTitle(title)}
      </Text>
      <Text size="sm" tone="secondary">
        {serpDate(new Date())} — {serpDescription(description)}
      </Text>
    </Stack>
  );
}

export interface MetaDataSectionProps {
  session: EditorSessionHandle;
  siteUrl: string;
}

/**
 * The post's search-engine metadata: a meta title and description that stand in
 * for the post's own, and the result they produce.
 */
export function MetaDataSection({ session, siteUrl }: MetaDataSectionProps) {
  const titleHintId = useId();
  const descriptionHintId = useId();

  const title = useSettingsField(session, 'meta_title', titleHintId);
  const description = useSettingsField(session, 'meta_description', descriptionHintId);

  const previewTitle = seoTitle(title.value, session.bind.title);
  const previewDescription = seoDescription(
    description.value,
    session.settings.custom_excerpt ?? '',
  );
  const previewUrl = seoUrl({
    siteUrl,
    slug: session.slug,
    canonicalUrl: session.settings.canonical_url ?? '',
  });

  return (
    <SettingsSubview
      closeLabel="Close meta data panel"
      icon={<LucideIcon.Search />}
      id="meta-data"
      label="Meta data"
      title="Meta data"
      wide
    >
      <Field>
        <FieldLabel htmlFor={title.fieldProps.id}>Meta title</FieldLabel>
        <Input
          data-testid={settingsMetaTitleInput}
          placeholder={previewTitle}
          {...title.fieldProps}
        />
        <Countdown id={titleHintId} recommended={META_TITLE_RECOMMENDED} value={title.value} />
        <FieldError {...title.errorProps}>{title.error}</FieldError>
      </Field>

      <Field>
        <FieldLabel htmlFor={description.fieldProps.id}>Meta description</FieldLabel>
        <Textarea
          data-testid={settingsMetaDescriptionInput}
          placeholder={metaDescriptionPlaceholder(previewDescription)}
          rows={3}
          {...description.fieldProps}
        />
        <Countdown
          id={descriptionHintId}
          recommended={META_DESCRIPTION_RECOMMENDED}
          value={description.value}
        />
        <FieldError {...description.errorProps}>{description.error}</FieldError>
      </Field>

      <Stack gap="sm">
        <Text size="sm" weight="medium">
          Search Engine Result Preview
        </Text>
        <SearchPreview description={previewDescription} title={previewTitle} url={previewUrl} />
      </Stack>
    </SettingsSubview>
  );
}
