import { useId } from 'react';
import {
  Field,
  FieldError,
  FieldLabel,
  GoogleLogo,
  Input,
  Textarea,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn, formatNumber } from '@tryghost/shade/utils';
import {
  settingsMetaDescriptionInput,
  settingsMetaTitleInput,
  settingsSerpPreview,
} from '@tryghost/test-data/selectors/editor';
import type { EditorSettingsPort } from './editor-settings-port';
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
      className="rounded-md border border-border bg-surface-elevated p-5 font-[Arial,sans-serif]"
      data-testid={settingsSerpPreview}
      gap="xs"
    >
      <Inline className="mb-5" gap="lg">
        <GoogleLogo aria-hidden="true" className="h-5 w-auto shrink-0" />
        <Inline className="h-7 min-w-0 flex-1 rounded-full bg-muted px-3" justify="end">
          <LucideIcon.Search className="size-4 text-muted-foreground" />
        </Inline>
      </Inline>
      <Text className="truncate text-[14px] leading-[1.3]" size="sm">
        {url}
      </Text>
      <Text className="text-[20px] leading-[1.3] text-search-result-title" size="lg">
        {serpTitle(title)}
      </Text>
      <Text
        className="text-[14px] leading-[22px] text-search-result-description"
        size="sm"
        tone="secondary"
      >
        {serpDate(new Date())} — {serpDescription(description)}
      </Text>
    </Stack>
  );
}

export interface MetaDataSectionProps {
  session: EditorSettingsPort;
  siteUrl: string;
}

/**
 * The post's search-engine metadata: a meta title and description that stand in
 * for the post's own, and the result they produce.
 */
export function MetaDataSection({ session, siteUrl }: MetaDataSectionProps) {
  const titleHintId = useId();
  const descriptionHintId = useId();

  const canonical = useSettingsField(session, 'canonical_url');
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

      <Field>
        <FieldLabel htmlFor={canonical.fieldProps.id}>Canonical URL</FieldLabel>
        <Input
          placeholder={
            session.loadedRecord?.url ?? `${siteUrl.replace(/\/$/, '')}/${session.slug}/`
          }
          {...canonical.fieldProps}
        />
        <FieldError {...canonical.errorProps}>{canonical.error}</FieldError>
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
