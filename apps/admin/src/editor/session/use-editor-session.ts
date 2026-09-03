import * as Sentry from '@sentry/react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from '@tryghost/admin-x-framework';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { useGenerateSlug } from '@tryghost/admin-x-framework/api/slugs';
import {
  useAddPage,
  useEditPage,
  useEditorPage,
  type PageEditableData,
} from '@tryghost/admin-x-framework/api/pages';
import {
  useAddPost,
  useEditPost,
  useEditorPost,
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
import { DEFAULT_TITLE, type SaveEngineState } from '@/editor/engine/save-engine';
import type { LexicalInput } from '@/editor/engine/lexical-compare';
import type { PostType } from '@/editor/card-config';
import { contentToText } from './content-text';
import { createEditorSession, type EditorSession, type EditorWritePayload } from './editor-session';
import type { EditorRecord } from './projection';
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
  onExcerptBlur: () => void;
  onLexicalChange: (lexical: unknown) => void;
  onSecondaryChange: (lexical: unknown) => void;
  onSecondaryError: (error: unknown) => void;
}

export interface EditorSessionHandle {
  bind: EditorSessionBinding;
  state: SaveEngineState;
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
  patchFeatureImage: EditorSession['patchFeatureImage'];
  dispatchField: () => void;
  dispatchExplicit: () => void;
  reauthSucceeded: () => void;
  reauthAbandoned: () => void;
}

export interface UseEditorSessionOptions {
  postType: PostType;
  record?: EditorRecord;
  siteUrl: string;
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
}: UseEditorSessionOptions): EditorSessionHandle {
  const navigate = useNavigate();
  const sessionKey = useEditorSessionKey();
  const fetchApi = useFetchApi();
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
    }
  }, [saved, session]);

  // Its own request: a failed refetch of the screen's query replaces the editor.
  const reload = useCallback(async (): Promise<ReloadOutcome> => {
    if (!persistedId) {
      return 'failed';
    }

    let fresh: EditorRecord | undefined;
    try {
      const path = postType === 'page' ? `/pages/${persistedId}/` : `/posts/${persistedId}/`;
      const data = await fetchApi<EditorReadResponse>(
        apiUrl(path, buildPostEditorReadParams()),
        EDITOR_REQUEST_OPTIONS,
      );
      fresh = postType === 'page' ? data.pages?.[0] : data.posts?.[0];
    } catch (error) {
      return error instanceof APIError && error.response?.status === 404 ? 'gone' : 'failed';
    }

    if (!fresh) {
      return 'gone';
    }

    if (!session.recordReloaded(fresh)) {
      return 'failed';
    }
    setTitle(fresh.title === DEFAULT_TITLE ? '' : fresh.title);
    setExcerpt(fresh.custom_excerpt ?? '');
    setInitialLexical(fresh.lexical ?? null);
    setLoadedRecord(fresh);
    setContentKey((key) => key + 1);
    return 'reloaded';
  }, [fetchApi, persistedId, postType, session]);

  const contentText = useCallback(
    () => contentToText(title, session.getLiveLexical()),
    [session, title],
  );

  const isNew = !record;
  useEffect(() => {
    if (isNew && persistedId) {
      navigate(`/editor/${postType}/${persistedId}`, {
        replace: true,
        state: { editorSession: sessionKey },
      });
    }
  }, [isNew, persistedId, postType, navigate, sessionKey]);

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

  const onExcerptBlur = useCallback(() => session.dispatchField(), [session]);

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

  return {
    bind: {
      title,
      excerpt,
      initialLexical,
      onTitleChange,
      onTitleBlur,
      onExcerptChange,
      onExcerptBlur,
      onLexicalChange,
      onSecondaryChange,
      onSecondaryError,
    },
    state,
    contentKey,
    loadedRecord,
    isDirty: () => session.getSaveSnapshot().isDirty,
    hasUnsavedContent: session.hasUnsavedContent,
    contentText,
    reload,
    patchFeatureImage: session.patchFeatureImage,
    dispatchField: session.dispatchField,
    dispatchExplicit: () => void session.dispatchExplicit(),
    reauthSucceeded: session.reauthSucceeded,
    reauthAbandoned: session.reauthAbandoned,
  };
}
