import { useMembersCount } from '@tryghost/admin-x-framework/api/members';
import {
  type Segment,
  useDeleteSegment,
  useEditSegment,
} from '@tryghost/admin-x-framework/api/segments';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  PopoverContent,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';
import { Fragment, useState } from 'react';
import { type SegmentUsage, isInUse, usageSummary } from './poc-store';
import { SegmentFields } from './segment-fields';
import { segmentWriteFailure } from './segment-write-failure';
import { NAME_MISSING } from './use-save-segment';

interface SegmentDialogProps {
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const count = (members: number | null) => (members === null ? '…' : formatNumber(members));

/** Names in bold, joined as a sentence would: "A", "A and B". */
function Names({ names }: { names: readonly string[] }) {
  return (
    <>
      {names.map((name, index) => (
        <Fragment key={name}>
          {index > 0 && ' and '}
          <strong>{name}</strong>
        </Fragment>
      ))}
    </>
  );
}

/**
 * What uses a segment, as part of a sentence. One or two are named, so the publisher knows
 * exactly what follows the segment: "the scheduled post A and the automation B". More than that
 * are counted, to keep the sentence one that can be read: "2 scheduled posts and 3 automations".
 */
function UsedIn({ usage }: { usage: SegmentUsage }) {
  const posts = usage.scheduledPosts.map(({ title }) => title);
  const automations = usage.automations.map(({ name }) => name);

  if (posts.length + automations.length > 2) {
    return <strong>{usageSummary(usage)}</strong>;
  }

  return (
    <>
      {posts.length > 0 && (
        <>
          the scheduled {posts.length === 1 ? 'post' : 'posts'} <Names names={posts} />
        </>
      )}
      {posts.length > 0 && automations.length > 0 && ' and '}
      {automations.length > 0 && (
        <>
          the {automations.length === 1 ? 'automation' : 'automations'}{' '}
          <Names names={automations} />
        </>
      )}
    </>
  );
}

/**
 * Renames a segment, in a popover from the button whose menu offered it, as the members screen's
 * "Edit view" did on main: renaming is the lightest change there is, and from the list of all
 * segments a dialog would open over that dialog. Nothing asks for confirmation: everything that
 * uses a segment refers to it by id, so a new name changes no audience.
 */
export function RenameSegmentPopoverContent({
  segment,
  onClose,
}: {
  segment: Segment;
  onClose: () => void;
}) {
  const [name, setName] = useState(segment.name);
  const [error, setError] = useState('');
  const { mutateAsync: editSegment, isPending } = useEditSegment();

  const save = async () => {
    const trimmed = name.trim();
    if (isPending) {
      return;
    }
    if (!trimmed) {
      setError(NAME_MISSING);
      return;
    }
    try {
      await editSegment({ id: segment.id, name: trimmed });
      onClose();
    } catch (err) {
      setError(segmentWriteFailure(err, 'edit'));
    }
  };

  return (
    <PopoverContent align="end" className="w-80" data-testid="rename-segment-popover">
      <Stack gap="md">
        <Text as="h3" size="sm" weight="semibold">
          Rename segment
        </Text>
        <SegmentFields
          error={error}
          name={name}
          onNameChange={(next) => {
            setName(next);
            setError('');
          }}
          onSubmit={() => void save()}
        />
        <Inline gap="sm" justify="end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={isPending}
            variant={error ? 'destructive' : 'default'}
            onClick={() => void save()}
          >
            {isPending ? 'Saving…' : error ? 'Retry' : 'Save'}
          </Button>
        </Inline>
      </Stack>
    </PopoverContent>
  );
}

interface DeleteSegmentDialogProps extends SegmentDialogProps {
  usage: SegmentUsage;
  onDeleted?: () => void;
}

/**
 * Deletes a segment, unless something uses it. A segment a scheduled post or an active
 * automation depends on can't be deleted: the dialog lists what to take it out of first.
 */
export function DeleteSegmentDialog({
  segment,
  usage,
  open,
  onOpenChange,
  onDeleted,
}: DeleteSegmentDialogProps) {
  const [error, setError] = useState('');
  const { mutateAsync: deleteSegment, isPending } = useDeleteSegment();
  const inUse = isInUse(usage);

  const confirm = async () => {
    try {
      await deleteSegment(segment.id);
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      setError(segmentWriteFailure(err, 'delete'));
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <AlertDialogContent data-testid="delete-segment-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {inUse ? `“${segment.name}” is in use` : `Delete “${segment.name}”?`}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            {inUse ? (
              <p>
                It can’t be deleted while it’s used in <UsedIn usage={usage} />. Choose another
                audience there first.
              </p>
            ) : (
              <Stack gap="sm">
                <p>
                  Deleting this segment removes it for all staff. Your members won’t be changed or
                  removed.
                </p>
                {error && (
                  <Text className="text-destructive" role="alert" size="sm">
                    {error}
                  </Text>
                )}
              </Stack>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{inUse ? 'Close' : 'Cancel'}</AlertDialogCancel>
          {!inUse && (
            <Button disabled={isPending} variant="destructive" onClick={() => void confirm()}>
              {isPending ? 'Deleting…' : 'Delete segment'}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface UpdateSegmentDialogProps extends SegmentDialogProps {
  /** The conditions the segment would change to. */
  nextFilter: string;
  usage: SegmentUsage;
  onUpdated?: () => void;
}

/**
 * Changes a segment's conditions. It shows how many members the segment has now and would have,
 * and what the change reaches, because whatever uses the segment follows it.
 */
export function UpdateSegmentDialog({
  segment,
  nextFilter,
  usage,
  open,
  onOpenChange,
  onUpdated,
}: UpdateSegmentDialogProps) {
  const [error, setError] = useState('');
  const { mutateAsync: editSegment, isPending } = useEditSegment();
  const { count: before } = useMembersCount(open ? segment.filter : null);
  const { count: after } = useMembersCount(open ? nextFilter : null);
  const inUse = isInUse(usage);

  const confirm = async () => {
    try {
      await editSegment({ id: segment.id, name: segment.name, filter: nextFilter });
      onOpenChange(false);
      onUpdated?.();
    } catch (err) {
      setError(segmentWriteFailure(err, 'edit'));
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <AlertDialogContent data-testid="update-segment-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Update “{segment.name}”?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <Stack gap="md">
              <p>
                This changes the segment from <strong>{count(before)}</strong> to{' '}
                <strong>{count(after)}</strong> {after === 1 ? 'member' : 'members'}.
              </p>
              {inUse && (
                <p>
                  It’s used in <UsedIn usage={usage} />, which will follow the change.
                </p>
              )}
              {error && (
                <Text className="text-destructive" role="alert" size="sm">
                  {error}
                </Text>
              )}
            </Stack>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button disabled={isPending} onClick={() => void confirm()}>
            {isPending ? 'Updating…' : 'Update segment'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
