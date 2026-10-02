import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useGenerateSlug } from '@tryghost/admin-x-framework/api/slugs';
import {
  useAddPage,
  useEditPage,
  useEditorPage,
  pagesDataType,
  type PageStatus,
} from '@tryghost/admin-x-framework/api/pages';
import {
  useAddPost,
  useEditPost,
  useEditorPost,
  postsDataType,
  type PostStatus,
} from '@tryghost/admin-x-framework/api/posts';
import {
  buildPostEditorReadParams,
  type PostWriteOptions,
} from '@tryghost/admin-x-framework/api/post-contract';
import {
  DEFAULT_TITLE,
  isCollisionToken,
  type LeaveDecision,
  type SaveCompletion,
  type SaveEngineState,
} from '@/editor/engine/save-engine';
import type { RestoredRevision } from '@/editor/engine/change-tracker';
import type { LexicalInput } from '@/editor/engine/lexical-compare';
import type { PostType } from '@/editor/card-config';
import { createLocalRevisionWriter } from '@/editor/local-revisions';
import {
  reportEditorError,
  reportLeaveConfirmation,
  reportSaveFailure,
} from '@/editor/report-error';
import { contentToText } from './content-text';
import {
  createEditorSession,
  type EditorCreatePayload,
  type EditorEditPayload,
  type EditorSession,
  type EditorSessionView,
} from './editor-session';
import { createPublishDispatcher } from './publish-dispatch';
import type { PublishDispatcher } from '@/editor/publish/publish-options';
import type { EditorRecord } from './projection';
import type { EditorSettingsFields, EditorSettingsPatch } from './settings-fields';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';

/** What a reload found: the server's copy, a post that is no longer there, or a read that failed. */
export type ReloadOutcome = 'reloaded' | 'gone' | 'failed';

interface EditorReadResponse {
  posts?: EditorRecord[];
  pages?: EditorRecord[];
}

export interface EditorSessionBinding {
  title: string;
  excerpt: string;
  initialLexical: string | null;
  onTitleChange: (title: string) => void;
  onTitleBlur: () => void;
  onExcerptChange: (excerpt: string) => void;
  onLexicalChange: (lexical: unknown) => void;
  onSecondaryChange: (lexical: unknown) => void;
  onSecondaryError: () => void;
}

export interface EditorSessionHandle {
  bind: EditorSessionBinding;
  state: SaveEngineState;
  pendingSave: EditorSessionView['pendingSave'];
  /** The server ID the post holds, once a create has acknowledged one. */
  persistedId: string | null;
  /** The server ID acquired by this session's first create, if it began new. */
  createdId: string | null;
  /** Moves when a reload replaces the document; keys the editor surface so both Koenig instances re-seed. */
  contentKey: number;
  /** The record the session is loaded at, replaced by a reload. */
  loadedRecord?: EditorRecord;
  isDirty: () => boolean;
  /** Whether a reload would discard the writer's own work, as opposed to only a failed save. */
  hasUnsavedContent: () => boolean;
  /** The unsaved title and body as plain text, for the writer to keep. */
  contentText: () => string;
  /** Replaces the document with the server's copy, or says why it could not. */
  reload: () => Promise<ReloadOutcome>;
  /** Puts a revision's content back into the editor and saves it; true once persisted. */
  restoreRevision: (restored: RestoredRevision) => Promise<boolean>;
  patchFeatureImage: EditorSession['patchFeatureImage'];
  /** The feature image's alt text and caption the session holds, another writer's once adopted. */
  featureImageAlt: string | null;
  featureImageCaption: string | null;
  /** The live settings fields, re-read on every sidebar edit. */
  settings: EditorSettingsFields;
  /** Stages a settings field, then asks the engine to save it. */
  editSettings: (patch: EditorSettingsPatch) => void;
  /** Stages a settings field the writer is still typing into, committing nothing. */
  stageSettings: (patch: EditorSettingsPatch) => void;
  /** Requests a settings save on the gesture that ends a settings-panel edit. */
  commitSettings: () => void;
  /** Requests a field save on the gesture that ends a canvas edit: the excerpt under the title or the feature image. */
  commitField: () => void;
  /** The title the engine holds, which is the default title while the input is blank. */
  title: string;
  /** The slug the machine holds, which the URL section's input reads. */
  slug: string;
  /** Routes a manual slug edit through the slug machine, then the save policy. */
  editSlug: EditorSession['editSlug'];
  /** The status and publish time the sidebar's date field reads. */
  publishTime: EditorSessionView['publishTime'];
  /** Stages the publish time, then applies the sidebar's save policy. */
  editPublishedAt: (publishedAt: string) => void;
  /** The post as the engine reads it: identity, status, publish time and title. */
  getSaveSnapshot: EditorSession['getSaveSnapshot'];
  /** The body the writer is looking at, which a save has not necessarily seen yet. */
  getLiveLexical: EditorSession['getLiveLexical'];
  /** Retries the save the error banner reports. */
  retrySave: () => void;
  /** An explicit save whose completion the caller acts on, such as before a publish or preview. */
  saveExplicit: () => Promise<SaveCompletion>;
  /** Runs the publish flow's commands through the engine, the only writer. */
  dispatchPublish: PublishDispatcher;
  reauthSucceeded: () => void;
  reauthAbandoned: () => void;
  /** Resolves once nothing is in flight; `proceed` means leaving loses nothing. */
  leaveRequested: () => Promise<LeaveDecision>;
  /** Ends the session: aborts what is in flight and refuses every later write. */
  dispose: () => void;
}

export interface UseEditorSessionOptions {
  postType: PostType;
  record?: EditorRecord;
  siteUrl: string;
  /** Authors a post this session creates. */
  currentUserId?: string;
}

/** A page is never sent, so the page write contract has no such status. */
function pageStatus(status: PostStatus | undefined): PageStatus | undefined {
  return status === 'sent' ? undefined : status;
}

/** Anything but a finite positive millisecond count leaves the engine's own debounce standing. */
function bootedDebounceMs(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

/** The screen's read of the post: its URL, and the cache entry the loader and the session share. */
function editorRead(postType: PostType, id: string) {
  const path = postType === 'page' ? `/pages/${id}/` : `/posts/${id}/`;
  const url = apiUrl(path, buildPostEditorReadParams());
  return { url, queryKey: [postType === 'page' ? pagesDataType : postsDataType, url] as const };
}

/** The post a read of the screen's query holds. */
function recordIn(
  postType: PostType,
  data: EditorReadResponse | undefined,
): EditorRecord | undefined {
  return postType === 'page' ? data?.pages?.[0] : data?.posts?.[0];
}

/** Whether `cached` is a later version of the same post as `record`. */
function isLaterVersion(
  cached: EditorRecord | undefined,
  record: EditorRecord,
): cached is EditorRecord {
  return (
    !!cached &&
    cached.id === record.id &&
    isCollisionToken(cached.updated_at) &&
    isCollisionToken(record.updated_at) &&
    Date.parse(cached.updated_at) > Date.parse(record.updated_at)
  );
}

export function useEditorSession({
  postType,
  record,
  siteUrl,
  currentUserId,
}: UseEditorSessionOptions): EditorSessionHandle {
  const fetchApi = useFetchApi();
  const queryClient = useQueryClient();
  const { data: configData } = useBrowseConfig({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const generateSlug = useGenerateSlug();
  const { mutateAsync: addPost } = useAddPost();
  const { mutateAsync: editPost } = useEditPost();
  const { mutateAsync: addPage } = useAddPage();
  const { mutateAsync: editPage } = useEditPage();

  const [persistedId, setPersistedId] = useState<string | null>(record?.id ?? null);
  const [title, setTitle] = useState(() =>
    record?.title === DEFAULT_TITLE ? '' : (record?.title ?? ''),
  );
  const [initialLexical, setInitialLexical] = useState(() => record?.lexical ?? null);
  const [loadedRecord, setLoadedRecord] = useState(record);
  const [contentKey, setContentKey] = useState(0);

  const transport = useRef({ addPost, editPost, addPage, editPage, generateSlug, postType });
  useEffect(() => {
    transport.current = { addPost, editPost, addPage, editPage, generateSlug, postType };
  });

  // `editorAutosaveDebounceMs` is test-only: the acceptance harness injects it through
  // its config boot override, and Ghost's `/config/` allow-list never sends it.
  const autosaveDebounceMs = useRef<number | undefined>(undefined);
  useEffect(() => {
    autosaveDebounceMs.current = bootedDebounceMs(configData?.config.editorAutosaveDebounceMs);
  });

  // Construction must start no timer, request or outside subscription:
  // StrictMode may call this twice and discard the first session undisposed.
  const [session] = useState<EditorSession>(() =>
    createEditorSession({
      record,
      siteUrl,
      currentUserId,
      saveFailureMessage: `Couldn’t save this ${postType}.`,
      autosaveDebounceMs: () => autosaveDebounceMs.current,
      onIdAcquired: setPersistedId,
      // The loader opens the post again from this entry, possibly before the read
      // that follows the save has landed; a later version a read put there stays.
      onSaveAcknowledged: (saved) => {
        queryClient.setQueryData<EditorReadResponse>(
          editorRead(postType, saved.id).queryKey,
          (cached) => {
            if (isLaterVersion(recordIn(postType, cached), saved)) {
              return undefined;
            }
            return postType === 'page' ? { pages: [saved] } : { posts: [saved] };
          },
        );
      },
      onError: reportEditorError,
      onSaveFailed: (failure) => reportSaveFailure(failure, postType),
      onLeaveConfirmed: (leave) => reportLeaveConfirmation(leave, postType),
      localRevisions: createLocalRevisionWriter({
        type: postType,
        storage: () => window.localStorage,
        onError: reportEditorError,
      }),
      transport: {
        create: async (payload: EditorCreatePayload) => {
          const current = transport.current;
          if (current.postType === 'page') {
            const { pages } = await current.addPage({
              page: { ...payload, status: pageStatus(payload.status) },
              sessionExpiryRedirect: false,
            });
            return pages[0];
          }
          const { posts } = await current.addPost({
            post: payload,
            sessionExpiryRedirect: false,
          });
          return posts[0];
        },
        update: async (payload: EditorEditPayload, options: PostWriteOptions) => {
          const current = transport.current;
          if (current.postType === 'page') {
            const { pages } = await current.editPage({
              page: { ...payload, status: pageStatus(payload.status) },
              options,
              sessionExpiryRedirect: false,
            });
            return pages[0];
          }
          const { posts } = await current.editPost({
            post: payload,
            options,
            sessionExpiryRedirect: false,
          });
          return posts[0];
        },
        generateSlug: (text, postId) =>
          transport.current.generateSlug({
            type: 'post',
            text,
            id: postId ?? undefined,
            sessionExpiryRedirect: false,
          }),
      },
    }),
  );

  // Disposal is deferred by a tick: StrictMode tears an effect down and sets it
  // up again in the same commit, and that must not dispose a live session.
  const pendingDispose = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(pendingDispose.current);
    return () => {
      pendingDispose.current = setTimeout(() => session.dispose());
    };
  }, [session]);

  // A closing or backgrounded tab never unmounts the editor, and a discarded one never fires `pagehide`.
  useEffect(() => {
    const flush = () => session.flushLocalRevision();
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flushWhenHidden);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flushWhenHidden);
    };
  }, [session]);

  const view = useSyncExternalStore(session.subscribe, session.getView);
  const {
    state,
    pendingSave,
    title: engineTitle,
    slug,
    settings,
    publishTime,
    featureImageAlt,
    featureImageCaption,
  } = view;

  // The view keeps its identity until one of the values it publishes
  // changes, so it stands in for all of them as a dependency.
  const isDirtyNow = useCallback(() => view.isDirty, [view]);

  const stageSettings = session.patchFields;

  const editPublishedAt = useCallback(
    (next: string) => {
      const before = session.getPublishedAt();
      session.editPublishedAt(next);
      const after = session.getPublishedAt();
      // The field commits on blur, so most commits carry the time already held.
      if (before === after) {
        return;
      }
      session.commitSettings();
    },
    [session],
  );

  const commitSettings = useCallback(() => session.commitSettings(), [session]);
  const commitField = useCallback(() => session.commitField(), [session]);

  const editSettings = useCallback(
    (patch: EditorSettingsPatch) => {
      stageSettings(patch);
      session.commitSettings();
    },
    [session, stageSettings],
  );

  // The saved record: the same query key the screen loaded with, so an existing
  // post shares one cache entry and a created one starts observing its own.
  const postQuery = useEditorPost(persistedId ?? '', {
    enabled: postType === 'post' && !!persistedId,
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const pageQuery = useEditorPage(persistedId ?? '', {
    enabled: postType === 'page' && !!persistedId,
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const saved = postType === 'page' ? pageQuery.data?.pages[0] : postQuery.data?.posts[0];

  // Only the version the session holds may replace what the screen describes. A
  // refused read is offered again as the engine moves on: a landing save may claim it.
  const acceptedRead = useRef<EditorRecord | undefined>(undefined);
  useEffect(() => {
    if (!saved || saved === acceptedRead.current) {
      return;
    }
    if (session.recordRefetched(saved)) {
      acceptedRead.current = saved;
      setLoadedRecord(saved);
    }
  }, [saved, session, state]);

  // Its own request: a query refetch would land before the session could refuse the copy.
  const reload = useCallback(async (): Promise<ReloadOutcome> => {
    if (!persistedId) {
      return 'failed';
    }

    const { url, queryKey } = editorRead(postType, persistedId);
    let data: EditorReadResponse;
    try {
      data = await fetchApi<EditorReadResponse>(url, EDITOR_REQUEST_OPTIONS);
    } catch (error) {
      return error instanceof APIError && error.response?.status === 404 ? 'gone' : 'failed';
    }

    let fresh = recordIn(postType, data);
    if (!fresh) {
      return 'gone';
    }

    // A normal detail refetch may have completed while this isolated reload was
    // in flight. Never replace a version we already know is newer.
    const cachedData = queryClient.getQueryData<EditorReadResponse>(queryKey);
    const cached = recordIn(postType, cachedData);
    if (cachedData && isLaterVersion(cached, fresh)) {
      data = cachedData;
      fresh = cached;
    }

    if (!session.recordReloaded(fresh)) {
      return 'failed';
    }
    // The loader owns the same query. Seed it with the accepted document so a
    // quick close and reopen cannot resurrect the stale version it first read.
    // Cancel first so an older refetch cannot land after this write.
    await queryClient.cancelQueries({ queryKey, exact: true });
    queryClient.setQueryData(queryKey, data);
    setTitle(fresh.title === DEFAULT_TITLE ? '' : fresh.title);
    setInitialLexical(fresh.lexical ?? null);
    setLoadedRecord(fresh);
    setContentKey((key) => key + 1);
    return 'reloaded';
  }, [fetchApi, persistedId, postType, queryClient, session]);

  // The editor surface re-seeds from the restored content in one commit with the
  // record it was saved onto, so the feature image is read back from that record.
  // A restore that did not persist leaves the surface as it was.
  const restoreRevision = useCallback(
    async (restored: RestoredRevision): Promise<boolean> => {
      const persisted = await session.restoreRevision(restored);
      if (!persisted) {
        return false;
      }
      // The session normalizes a blank restored title, so the surface reads it back.
      const fields = session.getFields();
      setTitle(fields.title === DEFAULT_TITLE ? '' : fields.title);
      setInitialLexical(restored.lexical);
      setLoadedRecord((current) =>
        current ? { ...current, ...restored, title: fields.title } : current,
      );
      setContentKey((key) => key + 1);
      return true;
    },
    [session],
  );

  const contentText = useCallback(
    () => contentToText(title, session.getLiveLexical()),
    [session, title],
  );

  const isNew = !record;
  const onTitleChange = useCallback(
    (next: string) => {
      setTitle(next);
      session.patchTitle(next);
    },
    [session],
  );

  const onExcerptChange = useCallback((next: string) => session.patchExcerpt(next), [session]);

  const onTitleBlur = useCallback(() => {
    session.commitTitle(title);
    session.commitField();
  }, [session, title]);

  const onLexicalChange = useCallback(
    (lexical: unknown) => {
      session.patchLexical(lexical);
      session.dispatchAutosave();
    },
    [session],
  );

  const onSecondaryChange = useCallback(
    (lexical: unknown) => session.setBaseline(lexical as LexicalInput),
    [session],
  );

  const onSecondaryError = useCallback(() => session.baselineFailed(), [session]);

  const dispatchPublish = useMemo(
    () =>
      createPublishDispatcher({
        publish: session.dispatchPublish,
        schedule: session.dispatchSchedule,
        revert: session.dispatchRevert,
      }),
    [session],
  );

  const retrySave = useCallback(() => void session.retrySave(), [session]);

  const excerpt = settings.custom_excerpt ?? '';
  const bind = useMemo<EditorSessionBinding>(
    () => ({
      title,
      excerpt,
      initialLexical,
      onTitleChange,
      onTitleBlur,
      onExcerptChange,
      onLexicalChange,
      onSecondaryChange,
      onSecondaryError,
    }),
    [
      excerpt,
      initialLexical,
      onExcerptChange,
      onLexicalChange,
      onSecondaryChange,
      onSecondaryError,
      onTitleBlur,
      onTitleChange,
      title,
    ],
  );

  // `react-hooks/exhaustive-deps` is off repo-wide: every member below is either
  // listed here or reached through `session`, which never changes.
  return useMemo<EditorSessionHandle>(
    () => ({
      bind,
      state,
      pendingSave,
      persistedId,
      createdId: isNew ? persistedId : null,
      isDirty: isDirtyNow,
      contentKey,
      loadedRecord,
      hasUnsavedContent: session.hasUnsavedContent,
      contentText,
      reload,
      restoreRevision,
      patchFeatureImage: session.patchFeatureImage,
      featureImageAlt,
      featureImageCaption,
      settings,
      editSettings,
      stageSettings,
      commitSettings,
      commitField,
      title: engineTitle,
      slug,
      editSlug: session.editSlug,
      publishTime,
      editPublishedAt,
      getSaveSnapshot: session.getSaveSnapshot,
      getLiveLexical: session.getLiveLexical,
      retrySave,
      saveExplicit: session.dispatchExplicit,
      dispatchPublish,
      reauthSucceeded: session.reauthSucceeded,
      reauthAbandoned: session.reauthAbandoned,
      leaveRequested: session.leaveRequested,
      dispose: session.dispose,
    }),
    [
      bind,
      commitField,
      commitSettings,
      contentKey,
      contentText,
      dispatchPublish,
      editPublishedAt,
      editSettings,
      engineTitle,
      featureImageAlt,
      featureImageCaption,
      isDirtyNow,
      isNew,
      loadedRecord,
      persistedId,
      publishTime,
      reload,
      restoreRevision,
      retrySave,
      session,
      settings,
      slug,
      stageSettings,
      state,
      pendingSave,
    ],
  );
}
