import { useMemo, useRef, useState } from 'react';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { Inline, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { useFocusContext } from '@tryghost/shade/app';
import { settingsPostHistoryButton } from '@tryghost/test-data/selectors/editor';
import type { PostCardConfig, PostType } from '@/editor/card-config';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import type { EditorSessionHandle } from '@/editor/session/use-editor-session';
import { canViewPostHistory, revisionEntries, type RevisionEntry } from './post-history';
import { PostHistoryModal } from './post-history-modal';
import { SettingsSection } from './settings-section';

export interface PostHistorySectionProps {
  session: EditorSessionHandle;
  postType: PostType;
  cardConfig: PostCardConfig;
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
}: PostHistorySectionProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { darkMode } = useFocusContext();
  const { data: settingsData } = useBrowseSettings({
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const timezone = getSettingValue<string>(settingsData?.settings ?? null, 'timezone') ?? 'Etc/UTC';

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
    <SettingsSection>
      <button
        ref={triggerRef}
        className="-mx-2 rounded-md px-2 py-1 text-left hover:bg-surface-elevated-2"
        data-testid={settingsPostHistoryButton}
        type="button"
        onClick={() => setOpen(true)}
      >
        <Inline gap="sm" justify="between">
          <Inline gap="sm">
            <LucideIcon.History className="size-4 text-text-secondary" />
            <Text size="sm">{postType === 'page' ? 'Page' : 'Post'} history</Text>
          </Inline>
          <LucideIcon.ChevronRight className="size-4 text-text-secondary" />
        </Inline>
      </button>
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
            (session.state.kind === 'error' && session.state.error.kind === 'session-invalid') ||
            session.state.kind === 'reauth-pending'
              ? 'Your session expired. Sign in again in a new tab, then try restoring again.'
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
    </SettingsSection>
  );
}
