import { useId } from 'react';
import { Input, Label, Textarea } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn, formatNumber } from '@tryghost/shade/utils';
import {
  settingsMetaDescriptionInput,
  settingsMetaTitleInput,
  settingsSerpPreview,
} from '@tryghost/test-data/selectors/editor';
import {
  META_DESCRIPTION_MAX,
  META_DESCRIPTION_TOO_LONG,
  META_TITLE_MAX,
  META_TITLE_TOO_LONG,
  overLength,
} from '@/editor/session/settings-fields';
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

function Countdown({ id, value, recommended }: { id: string; value: string; recommended: number }) {
  const used = characterCount(value);

  return (
    <Text id={id} size="sm" tone="secondary">
      Recommended: <b>{formatNumber(recommended)}</b> characters. You&apos;ve used{' '}
      <span className={cn('font-bold', used > recommended ? 'text-red' : 'text-green')}>
        {formatNumber(used)}
      </span>
    </Text>
  );
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <Text className="text-red" id={id} role="alert" size="sm">
      {message}
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
  const titleId = useId();
  const titleHintId = useId();
  const titleErrorId = useId();
  const descriptionId = useId();
  const descriptionHintId = useId();
  const descriptionErrorId = useId();

  const metaTitle = session.settings.meta_title ?? '';
  const metaDescription = session.settings.meta_description ?? '';
  const titleError = overLength(metaTitle, META_TITLE_MAX) ? META_TITLE_TOO_LONG : null;
  const descriptionError = overLength(metaDescription, META_DESCRIPTION_MAX)
    ? META_DESCRIPTION_TOO_LONG
    : null;

  const previewTitle = seoTitle(metaTitle, session.bind.title);
  const previewDescription = seoDescription(metaDescription, session.settings.custom_excerpt ?? '');
  const previewUrl = seoUrl({
    siteUrl,
    slug: session.getSaveSnapshot().slug,
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
      <Stack gap="sm">
        <Label htmlFor={titleId}>Meta title</Label>
        <Input
          aria-describedby={titleError ? `${titleHintId} ${titleErrorId}` : titleHintId}
          aria-invalid={!!titleError}
          data-testid={settingsMetaTitleInput}
          id={titleId}
          placeholder={previewTitle}
          value={metaTitle}
          onBlur={session.commitSettings}
          // A cleared field is stored as no value, the way the excerpt is.
          onChange={(event) => session.stageSettings({ meta_title: event.target.value || null })}
        />
        <Countdown id={titleHintId} recommended={META_TITLE_RECOMMENDED} value={metaTitle} />
        {titleError ? <FieldError id={titleErrorId} message={titleError} /> : null}
      </Stack>

      <Stack gap="sm">
        <Label htmlFor={descriptionId}>Meta description</Label>
        <Textarea
          aria-describedby={
            descriptionError ? `${descriptionHintId} ${descriptionErrorId}` : descriptionHintId
          }
          aria-invalid={!!descriptionError}
          data-testid={settingsMetaDescriptionInput}
          id={descriptionId}
          placeholder={metaDescriptionPlaceholder(previewDescription)}
          rows={3}
          value={metaDescription}
          onBlur={session.commitSettings}
          onChange={(event) =>
            session.stageSettings({ meta_description: event.target.value || null })
          }
        />
        <Countdown
          id={descriptionHintId}
          recommended={META_DESCRIPTION_RECOMMENDED}
          value={metaDescription}
        />
        {descriptionError ? (
          <FieldError id={descriptionErrorId} message={descriptionError} />
        ) : null}
      </Stack>

      <Stack gap="sm">
        <Text size="sm" weight="medium">
          Search Engine Result Preview
        </Text>
        <SearchPreview description={previewDescription} title={previewTitle} url={previewUrl} />
      </Stack>
    </SettingsSubview>
  );
}
