import * as Sentry from '@sentry/react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation } from '@tryghost/admin-x-framework';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { useGenerateSlug } from '@tryghost/admin-x-framework/api/slugs';
import {
  useAddPage,
  useEditPage,
  useEditorPage,
  pagesDataType,
  type PageEditableData,
} from '@tryghost/admin-x-framework/api/pages';
import {
  useAddPost,
  useEditPost,
  useEditorPost,
  postsDataType,
  type PostEditableData,
} from '@tryghost/admin-x-framework/api/posts';
import type {
  CreateContentData,
  EditContentData,
} from '@tryghost/admin-x-framework/api/content-types';
import {
  buildPostEditorReadParams,
  type PostWriteOptions,
} from '@tryghost/admin-x-framework/api/post-contract';
import {
  DEFAULT_TITLE,
  isCollisionToken,
  type LeaveDecision,
  type SaveCompletion,
  type PostStatus,
  type SaveEngineState,
} from '@/editor/engine/save-engine';
import type { RestoredRevision } from '@/editor/engine/change-tracker';
import type { LexicalInput } from '@/editor/engine/lexical-compare';
import type { PostType } from '@/editor/card-config';
import { contentToText } from './content-text';
import { createEditorSession, type EditorSession, type EditorWritePayload } from './editor-session';
import { createPublishDispatcher } from './publish-dispatch';
import type { PublishDispatcher } from '@/editor/publish/use-publish-flow';
import type { EditorRecord } from './projection';
import {
  SETTINGS_FIELD_KEYS,
  type EditorSettingsFields,
  type EditorSettingsPatch,
} from './settings-fields';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';

/** What a reload found: the server's copy, a post that is no longer there, or a read that failed. */
export type ReloadOutcome = 'reloaded' | 'gone' | 'failed';

interface EditorReadResponse {
  posts?: EditorRecord[];
  pages?: EditorRecord[];
}

interface EditorSessionLocationState {
  editorSession?: string;
}

/**
 * Identifies the editing session behind the current URL. A create replaces the
 * URL and carries the key forward, so the same session survives the swap.
 */
export function useEditorSessionKey(): string {
  const location = useLocation();
  const state = location.state as EditorSessionLocationState | null;
  return state?.editorSession ?? location.key;
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
  onSecondaryError: (error: unknown) => void;
}

export interface EditorSessionHandle {
  bind: EditorSessionBinding;
  state: SaveEngineState;
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
  /** The live settings fields, re-read on every sidebar edit. */
  settings: EditorSettingsFields;
  /** Stages a settings field, then applies the sidebar's save policy. */
  editSettings: (patch: EditorSettingsPatch) => void;
  /** Stages a settings field the writer is still typing into, committing nothing. */
  stageSettings: (patch: EditorSettingsPatch) => void;
  /**
   * Applies the sidebar's save policy to what is staged, on the blur that ends
   * an edit. The excerpt is a settings field wherever it is rendered.
   */
  commitSettings: () => void;
  /** The slug the machine holds, which the URL section's input reads. */
  slug: string;
  /** Routes a manual slug edit through the slug machine, then the save policy. */
  editSlug: EditorSession['editSlug'];
  /** The status and publish time the sidebar's date field reads. */
  publishTime: PublishTimeView;
  /** Stages the publish time, then applies the sidebar's save policy. */
  editPublishedAt: (publishedAt: string) => void;
  /** The post as the engine reads it: identity, status, publish time and title. */
  getSaveSnapshot: EditorSession['getSaveSnapshot'];
  /** The body the writer is looking at, which a save has not necessarily seen yet. */
  getLiveLexical: EditorSession['getLiveLexical'];
  dispatchField: () => void;
  dispatchExplicit: () => void;
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

export interface PublishTimeView {
  status: PostStatus;
  publishedAt: string | null;
}

function publishTimeOf(session: EditorSession): PublishTimeView {
  const snapshot = session.getSaveSnapshot();
  return { status: snapshot.status, publishedAt: snapshot.publishedAt };
}

function samePublishTime(a: PublishTimeView, b: PublishTimeView): boolean {
  return a.status === b.status && a.publishedAt === b.publishedAt;
}

function settingsFieldsOf(projection: EditorSettingsFields): EditorSettingsFields {
  const fields = {} as Record<string, unknown>;
  for (const key of SETTINGS_FIELD_KEYS) {
    fields[key] = projection[key];
  }
  return fields as EditorSettingsFields;
}

function reportError(error: unknown): void {
  // eslint-disable-next-line no-console
  console.error(error);
  Sentry.captureException(error);
}

export function useEditorSession({
  postType,
  record,
  siteUrl,
  currentUserId,
}: UseEditorSessionOptions): EditorSessionHandle {
  const fetchApi = useFetchApi();
  const queryClient = useQueryClient();
  const generateSlug = useGenerateSlug();
  const { mutateAsync: addPost } = useAddPost();
  const { mutateAsync: editPost } = useEditPost();
  const { mutateAsync: addPage } = useAddPage();
  const { mutateAsync: editPage } = useEditPage();

  const [persistedId, setPersistedId] = useState<string | null>(record?.id ?? null);
  const [title, setTitle] = useState(() =>
    record?.title === DEFAULT_TITLE ? '' : (record?.title ?? ''),
  );
  const [excerpt, setExcerpt] = useState(() => record?.custom_excerpt ?? '');
  const [initialLexical, setInitialLexical] = useState(() => record?.lexical ?? null);
  const [loadedRecord, setLoadedRecord] = useState(record);
  const [contentKey, setContentKey] = useState(0);

  const transport = useRef({ addPost, editPost, addPage, editPage, generateSlug, postType });
  useEffect(() => {
    transport.current = { addPost, editPost, addPage, editPage, generateSlug, postType };
  });

  const [session] = useState<EditorSession>(() =>
    createEditorSession({
      record,
      siteUrl,
      currentUserId,
      saveFailureMessage: `Couldn’t save this ${postType}.`,
      onIdAcquired: setPersistedId,
      onError: reportError,
      transport: {
        create: async (payload: EditorWritePayload) => {
          const current = transport.current;
          if (current.postType === 'page') {
            const { pages } = await current.addPage({
              page: payload as CreateContentData<PageEditableData>,
              sessionExpiryRedirect: false,
            });
            return pages[0];
          }
          const { posts } = await current.addPost({
            post: payload as CreateContentData<PostEditableData>,
            sessionExpiryRedirect: false,
          });
          return posts[0];
        },
        update: async (payload: EditorWritePayload, options: PostWriteOptions) => {
          const current = transport.current;
          if (current.postType === 'page') {
            const { pages } = await current.editPage({
              page: payload as EditContentData<PageEditableData>,
              options,
              sessionExpiryRedirect: false,
            });
            return pages[0];
          }
          const { posts } = await current.editPost({
            post: payload as EditContentData<PostEditableData>,
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

  const state = useSyncExternalStore(session.subscribe, session.getState);
  const isDirty = useSyncExternalStore(session.subscribe, session.isDirty);
  const slug = useSyncExternalStore(session.subscribe, session.getSlug);

  // Mirrored into React state, as the title and excerpt are: the session
  // notifies on engine and dirtiness changes, not on every field edit.
  const [settings, setSettings] = useState<EditorSettingsFields>(() =>
    settingsFieldsOf(session.getFields()),
  );

  // The engine's own status and publish time, mirrored for the same reason the
  // settings fields are: an edit is not an engine state change.
  const [publishTime, setPublishTime] = useState<PublishTimeView>(() => publishTimeOf(session));

  const stageSettings = useCallback(
    (patch: EditorSettingsPatch) => {
      session.patchFields(patch);
      setSettings(settingsFieldsOf(session.getFields()));
    },
    [session],
  );

  const editPublishedAt = useCallback(
    (next: string) => {
      const before = publishTimeOf(session);
      session.editPublishedAt(next);
      const after = publishTimeOf(session);
      // The field commits on blur, so most commits carry the time already held.
      if (samePublishTime(before, after)) {
        return;
      }
      setPublishTime(after);
      session.commitField();
    },
    [session],
  );

  const commitSettings = useCallback(() => session.commitField(), [session]);

  const editSettings = useCallback(
    (patch: EditorSettingsPatch) => {
      stageSettings(patch);
      session.commitField();
    },
    [session, stageSettings],
  );

  // An acknowledgement adopts the server's copy of the fields nobody edited
  // here, and that adoption has no edit of its own to mirror the session on.
  useEffect(() => {
    const next = settingsFieldsOf(session.getFields());
    setSettings((current) =>
      SETTINGS_FIELD_KEYS.every((key) => current[key] === next[key]) ? current : next,
    );
    setExcerpt(next.custom_excerpt ?? '');
    const time = publishTimeOf(session);
    setPublishTime((current) => (samePublishTime(current, time) ? current : time));
  }, [session, state]);

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

  useEffect(() => {
    if (!saved) {
      return;
    }
    // The screen's query and a reload both answer with the post; only a valid,
    // non-older collision token may replace what the screen describes.
    if (session.recordRefetched(saved)) {
      setLoadedRecord(saved);
      // The session adopts the server's copy of the fields nobody edited here,
      // so the inputs mirroring them are re-read rather than left behind.
      const fields = session.getFields();
      setSettings(settingsFieldsOf(fields));
      setExcerpt(fields.custom_excerpt ?? '');
      setPublishTime(publishTimeOf(session));
    }
  }, [saved, session]);

  // Its own request: a failed refetch of the screen's query replaces the editor.
  const reload = useCallback(async (): Promise<ReloadOutcome> => {
    if (!persistedId) {
      return 'failed';
    }

    const path = postType === 'page' ? `/pages/${persistedId}/` : `/posts/${persistedId}/`;
    const url = apiUrl(path, buildPostEditorReadParams());
    const queryKey = [postType === 'page' ? pagesDataType : postsDataType, url] as const;
    let data: EditorReadResponse;
    try {
      data = await fetchApi<EditorReadResponse>(url, EDITOR_REQUEST_OPTIONS);
    } catch (error) {
      return error instanceof APIError && error.response?.status === 404 ? 'gone' : 'failed';
    }

    let fresh = postType === 'page' ? data.pages?.[0] : data.posts?.[0];
    if (!fresh) {
      return 'gone';
    }

    // A normal detail refetch may have completed while this isolated reload was
    // in flight. Never replace a version we already know is newer.
    const cachedData = queryClient.getQueryData<EditorReadResponse>(queryKey);
    const cached = postType === 'page' ? cachedData?.pages?.[0] : cachedData?.posts?.[0];
    if (
      cachedData &&
      cached &&
      cached.id === fresh.id &&
      isCollisionToken(cached.updated_at) &&
      isCollisionToken(fresh.updated_at) &&
      Date.parse(cached.updated_at) > Date.parse(fresh.updated_at)
    ) {
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
    setExcerpt(fresh.custom_excerpt ?? '');
    setSettings(settingsFieldsOf(session.getFields()));
    setPublishTime(publishTimeOf(session));
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
      setExcerpt(fields.custom_excerpt ?? '');
      setSettings(settingsFieldsOf(fields));
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

  const onExcerptChange = useCallback(
    (next: string) => {
      setExcerpt(next);
      session.patchExcerpt(next);
    },
    [session],
  );

  const onTitleBlur = useCallback(() => {
    session.commitTitle(title);
    session.dispatchField();
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

  const onSecondaryError = useCallback(
    (error: unknown) => session.baselineFailed(error),
    [session],
  );

  const dispatchPublish = useMemo(
    () =>
      createPublishDispatcher({
        publish: session.dispatchPublish,
        schedule: session.dispatchSchedule,
        revert: session.dispatchRevert,
      }),
    [session],
  );

  return {
    bind: {
      title,
      excerpt,
      initialLexical,
      onTitleChange,
      onTitleBlur,
      onExcerptChange,
      onLexicalChange,
      onSecondaryChange,
      onSecondaryError,
    },
    state,
    createdId: isNew ? persistedId : null,
    isDirty: () => isDirty,
    contentKey,
    loadedRecord,
    hasUnsavedContent: session.hasUnsavedContent,
    contentText,
    reload,
    restoreRevision,
    patchFeatureImage: session.patchFeatureImage,
    settings,
    editSettings,
    stageSettings,
    commitSettings,
    slug,
    editSlug: session.editSlug,
    publishTime,
    editPublishedAt,
    getSaveSnapshot: session.getSaveSnapshot,
    getLiveLexical: session.getLiveLexical,
    dispatchField: session.dispatchField,
    dispatchExplicit: () => void session.dispatchExplicit(),
    saveExplicit: session.dispatchExplicit,
    dispatchPublish,
    reauthSucceeded: session.reauthSucceeded,
    reauthAbandoned: session.reauthAbandoned,
    leaveRequested: session.leaveRequested,
    dispose: session.dispose,
  };
}
