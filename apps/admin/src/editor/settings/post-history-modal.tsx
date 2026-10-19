import type React from 'react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  Badge,
  type BadgeProps,
  Button,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { toast } from 'sonner';
import {
  postHistoryModal,
  postHistoryPreview,
  postHistoryRestoreConfirm,
  postHistoryRevisionList,
} from '@tryghost/test-data/selectors/editor';
import type { PostCardConfig, PostType } from '@/editor/card-config';
import { FullscreenDialog } from '@/editor/fullscreen-dialog';
import { EDITOR_CONFIRM_DIALOG_LAYER } from '@/editor/layering';
import { memberAvatarProps } from '@/members/api';
import { revisionDate, type RevisionEntry, type RevisionTag } from './post-history';
import { RevisionPreview } from './revision-preview';

const TAG_LABELS: Record<RevisionTag, string> = {
  latest: 'Latest',
  published: 'Published',
  unpublished: 'Unpublished',
};

const TAG_VARIANTS: Record<RevisionTag, BadgeProps['variant']> = {
  latest: 'secondary',
  published: 'success',
  unpublished: 'warning',
};

function RevisionRow({
  revision,
  timezone,
  selected,
  restorable,
  onSelect,
  onRestore,
}: {
  revision: RevisionEntry;
  timezone: string;
  selected: boolean;
  restorable: boolean;
  onSelect: () => void;
  onRestore: () => void;
}) {
  return (
    <li
      className={cn(
        'relative rounded-md px-3 py-2',
        selected ? 'bg-tab-active' : 'hover:bg-interactive-hover',
      )}
    >
      <button aria-current={selected} className="w-full text-left" type="button" onClick={onSelect}>
        <Inline gap="sm" wrap>
          <Text className="whitespace-nowrap" size="sm" weight="medium">
            {revisionDate(revision.createdAt, timezone)}
          </Text>
          {revision.tags.map((tag) => (
            <Badge key={tag} variant={TAG_VARIANTS[tag]}>
              {TAG_LABELS[tag]}
            </Badge>
          ))}
        </Inline>
        <Inline className={cn('mt-1 min-h-7', selected && restorable && 'pr-20')} gap="sm">
          <Avatar
            className="size-6 shrink-0"
            {...memberAvatarProps({ name: revision.authorName })}
            src={revision.authorImage}
          />
          <Text className="truncate" size="sm" tone="secondary">
            {revision.authorName}
          </Text>
        </Inline>
      </button>
      {selected && restorable ? (
        <Button
          className="absolute right-3 bottom-2 bg-surface-elevated-2"
          size="sm"
          variant="outline"
          onClick={onRestore}
        >
          Restore
        </Button>
      ) : null}
    </li>
  );
}

export interface PostHistoryModalProps {
  open: boolean;
  revisions: RevisionEntry[];
  postType: PostType;
  /** The published copy is replaced by a restore, which the confirmation says. */
  isPublished: boolean;
  timezone: string;
  cardConfig: PostCardConfig;
  darkMode: boolean;
  showExcerpt: boolean;
  /** The post's own title and excerpt, for a version that carries neither. */
  currentTitle: string;
  currentExcerpt: string | null;
  onRestore: (revision: RevisionEntry) => Promise<boolean>;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
  restoreError?: string;
}

/**
 * The post's saved versions beside a read-only rendering of the selected one.
 * Every version but the newest can be restored, which replaces the post's
 * content and saves it.
 */
export function PostHistoryModal({
  open,
  revisions,
  postType,
  isPublished,
  timezone,
  cardConfig,
  darkMode,
  showExcerpt,
  currentTitle,
  currentExcerpt,
  onRestore,
  onOpenChange,
  onCloseAutoFocus,
  restoreError,
}: PostHistoryModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [confirming, setConfirming] = useState<RevisionEntry | null>(null);
  const [restoring, setRestoring] = useState(false);
  const selected = revisions[selectedIndex];

  // Radix closes on action click; the confirmation stays up until the save lands.
  const confirmRestore = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (!confirming || restoring) {
      return;
    }
    setRestoring(true);
    const restored = await onRestore(confirming);
    setRestoring(false);
    setConfirming(null);

    if (restored) {
      toast.success('Revision restored.');
      onOpenChange(false);
      return;
    }
    toast.error('Failed to restore revision.');
  };

  return (
    <>
      <FullscreenDialog
        data-testid={postHistoryModal}
        headerActions={
          <Button disabled={restoring} onClick={() => onOpenChange(false)}>
            Close
          </Button>
        }
        layout="header"
        open={open}
        title={`${postType === 'page' ? 'Page' : 'Post'} history`}
        onCloseAutoFocus={onCloseAutoFocus}
        onOpenChange={(next) => !restoring && onOpenChange(next)}
      >
        <Inline align="stretch" className="min-h-0" gap="none">
          <div className="min-w-0 flex-1 overflow-y-auto bg-surface-panel p-8">
            {selected ? (
              <RevisionPreview
                cardConfig={cardConfig}
                currentExcerpt={currentExcerpt}
                currentTitle={currentTitle}
                darkMode={darkMode}
                revision={selected}
                showExcerpt={showExcerpt}
              />
            ) : (
              <Text data-testid={postHistoryPreview} tone="secondary">
                This {postType} has no saved versions yet.
              </Text>
            )}
          </div>
          <Stack
            className="w-[320px] shrink-0 overflow-y-auto border-l border-border p-3"
            gap="none"
          >
            {restoreError ? (
              <Text className="mb-3 text-destructive" role="alert" size="sm">
                {restoreError}
              </Text>
            ) : null}
            <ul className="grid gap-px" data-testid={postHistoryRevisionList}>
              {revisions.map((revision, index) => (
                <RevisionRow
                  key={revision.id}
                  restorable={index !== 0 && revision.lexical !== null}
                  revision={revision}
                  selected={index === selectedIndex}
                  timezone={timezone}
                  onRestore={() => setConfirming(revision)}
                  onSelect={() => setSelectedIndex(index)}
                />
              ))}
            </ul>
          </Stack>
        </Inline>
      </FullscreenDialog>

      <AlertDialog
        open={!!confirming}
        onOpenChange={(next) => !next && !restoring && setConfirming(null)}
      >
        <AlertDialogContent
          className={EDITOR_CONFIRM_DIALOG_LAYER}
          data-testid={postHistoryRestoreConfirm}
          overlayClassName={EDITOR_CONFIRM_DIALOG_LAYER}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPublished ? `Restore version for published ${postType}?` : 'Restore this version?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isPublished
                ? `Heads up! This ${postType} has already been published, restoring a previous version will automatically update the ${postType} on your site.`
                : `Replace your existing draft with this version of the ${postType}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button disabled={restoring} variant="outline">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button disabled={restoring} onClick={(event) => void confirmRestore(event)}>
                Restore
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
