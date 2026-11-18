import {
  type Segment,
  type SegmentsResponseType,
  useAddSegment,
  useBrowseSegments,
  useDeleteSegment,
  useEditSegment,
} from '@tryghost/admin-x-framework/api/segments';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { APIError, JSONError } from '@tryghost/admin-x-framework/errors';
import { canManageMembers } from '@tryghost/admin-x-framework/api/users';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useCallback, useEffect, useMemo } from 'react';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import { z } from 'zod';
import {
  useDeleteMemberViewFromSettings,
  useMemberViewsFromSettings,
  useSaveMemberViewToSettings,
} from '@/members/member-views-from-settings';

/**
 * Saved member views, for the members screen and the sidebar. Callers list, save, rename and
 * delete views through these hooks without knowing where Ghost stores them.
 */

/** A saved member view: a named member filter. The filter identifies the view. */
export interface MemberView {
  name: string;
  filter: string;
}

/** Whether a segments request failed because the server is older than the segments API. */
function isSegmentsApiMissing(error: unknown): boolean {
  return error instanceof APIError && error.response?.status === 404;
}

/**
 * Where the server keeps member views, as the segments list tells it:
 *
 * - `segments`: the list loaded, so views are read and written through the segments API.
 * - `settings`: the list answered 404. Admin can be deployed ahead of Ghost, so this is a server
 *   older than the segments API, and views are read and written through the settings.
 * - `unknown`: the list hasn't loaded, or it failed for another reason.
 *
 * Every read and write of member views takes this decision from `memberViewsSource`, so
 * `settings` is the one thing to remove, with `member-views-from-settings.ts`, once every server
 * Admin supports has the segments API.
 */
type MemberViewsSource =
  | { api: 'segments'; segments: Segment[] }
  | { api: 'settings' }
  | { api: 'unknown'; error: unknown };

/**
 * The source the segments list's latest answer points to. A 404 decides even when a list loaded
 * earlier in the session is still cached, since a server can be rolled back to a version without
 * the segments API.
 */
function memberViewsSource(list: {
  data: SegmentsResponseType | undefined;
  error: unknown;
}): MemberViewsSource {
  if (isSegmentsApiMissing(list.error)) {
    return { api: 'settings' };
  }
  if (list.data) {
    return { api: 'segments', segments: list.data.segments };
  }
  return { api: 'unknown', error: list.error };
}

/**
 * The segments list, requested only for staff who are shown member views. Once the server answers
 * 404 the query is disabled, so a server older than the segments API gets one failed request, not
 * one each time the sidebar or the members screen mounts. Any other failure isn't retried on
 * mount either: the sidebar and the members screen each mount this query, so a failing list
 * would otherwise be requested, and its failure reported, on every visit.
 */
function useSegmentsQuery() {
  const { data: currentUser } = useCurrentUser();
  const showsMemberViews = Boolean(currentUser && canManageMembers(currentUser));

  return useBrowseSegments({
    defaultErrorHandler: false,
    retryOnMount: false,
    enabled: (query) => showsMemberViews && !isSegmentsApiMissing(query.state.error),
  });
}

/**
 * The saved member views in display order. They come from the segments API once its list has
 * loaded. Until then, and when it can't be read, they come from the cached settings, which Ghost
 * stores them in, so they show as soon as the settings load. On a server without the segments
 * API they always come from the settings, which is also where views are then written.
 */
export function useMemberViews(): MemberView[] {
  const { data, error } = useSegmentsQuery();
  const handleError = useHandleError();
  const source = memberViewsSource({ data, error });
  const storedInSettings = source.api === 'settings';
  const settingsViews = useMemberViewsFromSettings(storedInSettings);

  useEffect(() => {
    if (error && !storedInSettings) {
      handleError(error, { withToast: false });
    }
  }, [error, handleError, storedInSettings]);

  return source.api === 'segments' ? source.segments : settingsViews;
}

type Write = 'add' | 'rename' | 'delete';

const VIEW_NOT_FOUND_ERROR = 'This view no longer exists';
const WRITE_FAILED_ERRORS: Record<Write, string> = {
  add: 'Failed to save view',
  rename: 'Failed to save view',
  delete: 'Failed to delete view',
};
const NO_PERMISSION_ERRORS: Record<Write, string> = {
  add: 'You do not have permission to save views',
  rename: 'You do not have permission to save views',
  delete: 'You do not have permission to delete views',
};

/**
 * The longest view name, in characters, that can be saved. It mirrors the segments API's limit,
 * which refuses a longer name with an error the popover can only show as a generic failure.
 */
export const MEMBER_VIEW_NAME_MAX_LENGTH = 191;

/**
 * The error body of a write that one of the segment rules refused, such as a duplicate name: a
 * validation error that names the field in `property`, with `context` written for a publisher.
 * The API framework answers a request it can't parse with a validation error too, but that one
 * carries the parsing problems in `details`. A validation error that names no field is a
 * condition of the server, such as a stored value it can't read, not something to rename around.
 */
const RuleRefusal = z.object({
  type: z.literal('ValidationError'),
  context: z.string().min(1),
  property: z.string().min(1),
  details: z.null().optional(),
});

/** A failed segments write as the popover shows it, in terms of views. */
class ViewWriteError extends Error {
  /** Whether the failure is the publisher's to fix, rather than one to report. */
  readonly refused: boolean;
  /** Whether the failure means the views Admin has cached are no longer the server's. */
  readonly outOfDate: boolean;

  constructor(
    message: string,
    { refused, outOfDate, cause }: { refused: boolean; outOfDate: boolean; cause?: unknown },
  ) {
    super(message, { cause });
    this.refused = refused;
    this.outOfDate = outOfDate;
  }
}

function viewNotFound(cause?: unknown): ViewWriteError {
  return new ViewWriteError(VIEW_NOT_FOUND_ERROR, { refused: true, outOfDate: true, cause });
}

/**
 * The message a failed segments write shows. A 404 for a rename or a delete is a view that no
 * longer exists. A 404 for a new view has no view to be missing, so it reads as a failed save,
 * but the views are still treated as out of date, since the segments API may have gone. A
 * refusal by a segment rule shows the server's text. A 403 says the staff user may not change
 * views, in terms of views, since the server's text names segments. Anything else reads as a
 * failed write.
 */
function toViewWriteError(error: unknown, write: Write): ViewWriteError {
  if (error instanceof ViewWriteError) {
    return error;
  }

  const status = error instanceof JSONError ? error.response?.status : undefined;
  const failed = WRITE_FAILED_ERRORS[write];

  if (status === 404) {
    return write === 'add'
      ? new ViewWriteError(failed, { refused: false, outOfDate: true, cause: error })
      : viewNotFound(error);
  }

  if (status === 403) {
    return new ViewWriteError(NO_PERMISSION_ERRORS[write], {
      refused: true,
      outOfDate: false,
      cause: error,
    });
  }

  if (status === 422 && error instanceof JSONError) {
    const refusal = RuleRefusal.safeParse(error.data?.errors?.[0]);
    if (refusal.success) {
      return new ViewWriteError(refusal.data.context, {
        refused: true,
        outOfDate: true,
        cause: error,
      });
    }
  }

  return new ViewWriteError(failed, { refused: false, outOfDate: false, cause: error });
}

/**
 * Somewhere member views are written: the segments API, or the settings on a server without it.
 * A write that fails rejects with an error whose message the popover shows.
 */
interface MemberViewStore {
  /** Saves a new view, or renames `originalView` when one is given. */
  save(name: string, filter: string, originalView?: MemberView): Promise<void>;
  remove(view: MemberView): Promise<void>;
}

/**
 * Resolves the store a member view write goes to, waiting for the segments list when it hasn't
 * loaded yet. A store is plain functions and is resolved for each write, not once per render,
 * because which store applies is known only after the list has answered and can change during a
 * session, as when a server is rolled back.
 */
function useResolveMemberViewStore(): (write: Write) => Promise<MemberViewStore> {
  const { data, error, refetch: refetchSegments } = useSegmentsQuery();
  const { refetch: refetchSettings } = useBrowseSettings();
  const handleError = useHandleError();
  const saveToSettings = useSaveMemberViewToSettings();
  const deleteFromSettings = useDeleteMemberViewFromSettings();
  const { mutateAsync: addSegment } = useAddSegment();
  const { mutateAsync: editSegment } = useEditSegment();
  const { mutateAsync: deleteSegment } = useDeleteSegment();

  const settingsStore = useMemo<MemberViewStore>(
    () => ({ save: saveToSettings, remove: deleteFromSettings }),
    [deleteFromSettings, saveToSettings],
  );

  /**
   * Sends a segments write. A successful write updates the cached segments list from its
   * response. A failed one refetches the list and the settings when the failure means they are
   * out of date, as with a view deleted in another tab. Other failures, such as a server that
   * can't be reached, say nothing about the cached copies, and refetching would only fail too.
   */
  const send = useCallback(
    async (write: Write, request: () => Promise<unknown>): Promise<void> => {
      try {
        await request();
      } catch (requestError) {
        const viewError = toViewWriteError(requestError, write);
        if (viewError.outOfDate) {
          void refetchSegments();
          void refetchSettings();
        }
        if (!viewError.refused) {
          handleError(requestError, { withToast: false, displayedMessage: viewError.message });
        }
        throw viewError;
      }
    },
    [handleError, refetchSegments, refetchSettings],
  );

  /** The store that writes through the segments API, given the server's current segments. */
  const segmentsStore = useCallback(
    (segments: Segment[]): MemberViewStore => {
      const segmentOf = (view: MemberView): Segment => {
        const segment = segments.find((candidate) => candidate.filter === view.filter);
        if (!segment) {
          throw viewNotFound();
        }
        return segment;
      };

      return {
        save: (name, filter, originalView) =>
          send(originalView ? 'rename' : 'add', () =>
            originalView
              ? editSegment({ id: segmentOf(originalView).id, name: name.trim() })
              : addSegment({ name: name.trim(), filter }),
          ),
        remove: (view) => send('delete', () => deleteSegment(segmentOf(view).id)),
      };
    },
    [addSegment, deleteSegment, editSegment, send],
  );

  return useCallback(
    async (write: Write): Promise<MemberViewStore> => {
      let source = memberViewsSource({ data, error });
      if (source.api === 'unknown') {
        source = memberViewsSource(await refetchSegments({ cancelRefetch: false }));
      }

      if (source.api === 'settings') {
        return settingsStore;
      }
      if (source.api === 'segments') {
        return segmentsStore(source.segments);
      }

      const failed = WRITE_FAILED_ERRORS[write];
      // A fetch that was cancelled settles with neither a list nor an error.
      if (source.error) {
        handleError(source.error, { withToast: false, displayedMessage: failed });
      }
      throw new ViewWriteError(failed, { refused: false, outOfDate: false, cause: source.error });
    },
    [data, error, handleError, refetchSegments, segmentsStore, settingsStore],
  );
}

export function useSaveMemberView() {
  const resolveStore = useResolveMemberViewStore();

  return useCallback(
    async (name: string, filter: string, originalView?: MemberView) => {
      const store = await resolveStore(originalView ? 'rename' : 'add');
      await store.save(name, filter, originalView);
    },
    [resolveStore],
  );
}

export function useDeleteMemberView() {
  const resolveStore = useResolveMemberViewStore();

  return useCallback(
    async (view: MemberView) => {
      const store = await resolveStore('delete');
      await store.remove(view);
    },
    [resolveStore],
  );
}

export function useActiveMemberView(
  views: MemberView[],
  nql: string | undefined,
): MemberView | null {
  return useMemo(() => {
    if (!nql || views.length === 0) {
      return null;
    }

    return views.find((view) => view.filter === nql) ?? null;
  }, [views, nql]);
}
