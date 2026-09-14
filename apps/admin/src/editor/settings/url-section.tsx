import { type KeyboardEvent, useCallback, useId, useState } from 'react';
import { Input, Label } from '@tryghost/shade/components';
import { Text } from '@tryghost/shade/primitives';
import {
  settingsSlugError,
  settingsSlugInput,
  settingsUrlPreview,
} from '@tryghost/test-data/selectors/editor';
import type { PostType } from '@/editor/card-config';
import { normalizeManualSlug } from '@/editor/engine/slug-machine';
import type { EditorSessionHandle } from '@/editor/session/use-editor-session';
import { SettingsSection } from './settings-section';
import { formatUrlPreview } from './url-preview';

const EDIT_FAILED = 'Couldn’t update the URL. Try again.';

/**
 * The post's URL: a slug input over a preview of where the post will live. The
 * slug machine owns the value, so an edit goes to it rather than to a field.
 */
export function UrlSection({
  session,
  postType,
  siteUrl,
}: {
  session: EditorSessionHandle;
  postType: PostType;
  siteUrl: string;
}) {
  const inputId = useId();
  const errorId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const { slug, editSlug } = session;
  const value = draft ?? slug;

  const commit = useCallback(() => {
    setFailed(false);
    if (normalizeManualSlug(value, slug) === null) {
      setDraft(null);
      return;
    }
    setPending(true);
    void editSlug(value)
      .then((outcome) => setFailed(outcome === 'failed'))
      .finally(() => {
        setPending(false);
        setDraft(null);
      });
  }, [editSlug, slug, value]);

  // Enter commits through the blur handler, so a keyed and a clicked-away edit
  // cannot both submit the same value.
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }
  }, []);

  return (
    <SettingsSection>
      <Label htmlFor={inputId}>{postType === 'page' ? 'Page' : 'Post'} URL</Label>
      <Input
        aria-describedby={failed ? errorId : undefined}
        aria-invalid={failed}
        data-testid={settingsSlugInput}
        disabled={pending}
        id={inputId}
        value={value}
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
      />
      {failed ? (
        <Text
          className="text-destructive"
          data-testid={settingsSlugError}
          id={errorId}
          role="alert"
          size="sm"
        >
          {EDIT_FAILED}
        </Text>
      ) : null}
      <Text data-testid={settingsUrlPreview} size="sm" tone="secondary">
        {formatUrlPreview(siteUrl, value)}
      </Text>
    </SettingsSection>
  );
}
