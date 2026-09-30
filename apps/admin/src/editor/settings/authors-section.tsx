import { useCallback, useEffect, useId, useState } from 'react';
import { FieldError, Label } from '@tryghost/shade/components';
import { useBrowseUsers, type User } from '@tryghost/admin-x-framework/api/users';
import type { PostAuthor } from '@tryghost/admin-x-framework/api/posts';
import { settingsAuthorsError } from '@tryghost/test-data/selectors/editor';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import { AUTHORS_REQUIRED } from '@/editor/session/settings-fields';
import type { EditorSettingsPort } from './editor-settings-port';
import { SettingsSection } from './settings-section';
import { AuthorsPicker } from './authors-picker';
import { AUTHORS_SEARCH_PARAMS, selectedAuthors, type AuthorOption } from './authors-options';

export interface AuthorsSectionProps {
  session: EditorSettingsPort;
  currentUser?: User;
}

/**
 * Who the post is credited to. Authors are a settings field, so the sidebar's
 * save policy decides when the list is persisted, and the post keeps the order
 * the field lists them in.
 */
export function AuthorsSection({ session, currentUser }: AuthorsSectionProps) {
  const inputId = useId();
  const errorId = useId();
  const [browsing, setBrowsing] = useState(false);
  const startBrowsing = useCallback(() => setBrowsing(true), []);

  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, isError, refetch } =
    useBrowseUsers({
      defaultErrorHandler: false,
      enabled: browsing,
      requestOptions: EDITOR_REQUEST_OPTIONS,
      searchParams: AUTHORS_SEARCH_PARAMS,
    });

  // Core caps `limit=all`, so the response can still contain a next page. The
  // list is not complete, and so still loading, until every page has arrived.
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isError) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isError]);

  const authors = session.settings.authors as ReadonlyArray<PostAuthor>;
  // A post this session created carries its author's identity alone, and the
  // browse only runs once the list is opened.
  const known = [...(data?.users ?? []), ...(currentUser ? [currentUser] : [])];
  const selected = selectedAuthors(authors, known);
  const invalid = selected.length === 0;

  // The whole record stays in the field: reduced to identities here, a chip the
  // browse has not named would fall back to its id.
  const change = (next: AuthorOption[]) => session.editSettings({ authors: next });

  return (
    <SettingsSection>
      <Label htmlFor={inputId}>Authors</Label>
      <AuthorsPicker
        describedBy={invalid ? errorId : undefined}
        inputId={inputId}
        invalid={invalid}
        loadError={isError}
        loading={isFetching || hasNextPage}
        selected={selected}
        staff={data?.users ?? []}
        onChange={change}
        onOpen={startBrowsing}
        onRetry={() => void refetch()}
      />
      {invalid ? (
        <FieldError data-testid={settingsAuthorsError} id={errorId}>
          {AUTHORS_REQUIRED}
        </FieldError>
      ) : null}
    </SettingsSection>
  );
}
