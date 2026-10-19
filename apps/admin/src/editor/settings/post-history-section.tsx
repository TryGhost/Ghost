import { useMemo, useRef, useState } from 'react';
import { LucideIcon } from '@tryghost/shade/utils';
import { useFocusContext } from '@tryghost/shade/app';
import { settingsPostHistoryButton } from '@tryghost/test-data/selectors/editor';
import type { PostCardConfig, PostType } from '@/editor/card-config';
import type { SaveEngineState } from '@/editor/engine/save-engine';
import { useSiteTimezone } from '@/editor/use-editor-settings';
import type { EditorSettingsPort } from './editor-settings-port';
import { canViewPostHistory, revisionEntries, type RevisionEntry } from './post-history';
import { PostHistoryModal } from './post-history-modal';
import { SettingsNavigationRow } from './settings-navigation-row';

export interface PostHistorySectionProps {
  session: EditorSettingsPort;
  postType: PostType;
  cardConfig: PostCardConfig;
  /** The save engine's state, which says whether a restore can be written at all. */
  state: SaveEngineState;
  /** The excerpt has its own home under the title, and is restored with the version. */
  showExcerpt: boolean;
}

/**
 * Opens the post's version history. The row is absent for a post with no saved
 * versions to show: one that has never been saved, one with no lexical content,
 * and a published or sent post that only ever went out as an email.
 */
export function PostHistorySection({
  session,
  postType,
  cardConfig,
  showExcerpt,
  state,
}: PostHistorySectionProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { darkMode } = useFocusContext();
  const timezone = useSiteTimezone();

  const record = session.loadedRecord;
  const revisions = useMemo(() => revisionEntries(record?.post_revisions), [record]);

  if (!canViewPostHistory(record)) {
    return null;
  }

  // A version written before the excerpt existed carries none, and the post
  // keeps the excerpt it has rather than losing it to the restore.
  const restore = (revision: RevisionEntry) =>
    session.restoreRevision({
      lexical: revision.lexical,
      title: revision.title,
      custom_excerpt: showExcerpt
        ? (revision.customExcerpt ?? session.settings.custom_excerpt)
        : session.settings.custom_excerpt,
      feature_image: revision.featureImage,
      feature_image_alt: revision.featureImageAlt,
      feature_image_caption: revision.featureImageCaption,
    });

  return (
    <>
      <SettingsNavigationRow
        ref={triggerRef}
        data-testid={settingsPostHistoryButton}
        icon={<LucideIcon.History />}
        onClick={() => setOpen(true)}
      >
        {postType === 'page' ? 'Page' : 'Post'} history
      </SettingsNavigationRow>
      {open ? (
        <PostHistoryModal
          cardConfig={cardConfig}
          currentExcerpt={session.settings.custom_excerpt ?? null}
          currentTitle={record?.title ?? ''}
          darkMode={darkMode}
          isPublished={record?.status === 'published'}
          open={open}
          postType={postType}
          restoreError={
            (state.kind === 'error' && state.error.kind === 'session-invalid') ||
            state.kind === 'reauth-pending'
              ? 'Your session expired. Restore again to sign in and continue.'
              : undefined
          }
          revisions={revisions}
          showExcerpt={showExcerpt}
          timezone={timezone}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
          onOpenChange={setOpen}
          onRestore={restore}
        />
      ) : null}
    </>
  );
}
