import { type KeyboardEvent, useCallback, useId, useState } from 'react';
import { Input, Label, Separator } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { getHomepageUrl, useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { settingsSlugInput, settingsUrlPreview } from '@tryghost/test-data/selectors/editor';
import type { PostType } from '@/editor/card-config';
import { normalizeManualSlug } from '@/editor/engine/slug-machine';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import type { EditorSessionHandle } from '@/editor/session/use-editor-session';
import { formatUrlPreview } from './url-preview';

/**
 * The post's URL: a slug input over a preview of where the post will live. The
 * slug machine owns the value, so an edit goes to it rather than to a field.
 */
export function UrlSection({
  session,
  postType,
}: {
  session: EditorSessionHandle;
  postType: PostType;
}) {
  const inputId = useId();
  const { data: siteData } = useBrowseSite({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const { slug, editSlug } = session;
  const value = draft ?? slug;

  const commit = useCallback(() => {
    if (normalizeManualSlug(value, slug) === null) {
      setDraft(null);
      return;
    }
    setPending(true);
    void editSlug(value).finally(() => {
      setPending(false);
      setDraft(null);
    });
  }, [editSlug, slug, value]);

  // Enter commits through the blur handler, so a keyed and a clicked-away edit
  // cannot both submit the same value.
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }, []);

  return (
    <>
      <Stack className="px-5 py-4" gap="sm">
        <Label htmlFor={inputId}>{postType === 'page' ? 'Page' : 'Post'} URL</Label>
        <Input
          data-testid={settingsSlugInput}
          disabled={pending}
          id={inputId}
          value={value}
          onBlur={commit}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <Text data-testid={settingsUrlPreview} size="sm" tone="secondary">
          {formatUrlPreview(siteData?.site ? getHomepageUrl(siteData.site) : '', value)}
        </Text>
      </Stack>
      <Separator />
    </>
  );
}
