import * as Sentry from '@sentry/react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from '@tryghost/admin-x-framework';
import { useGenerateSlug } from '@tryghost/admin-x-framework/api/slugs';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
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
import type { PostWriteOptions } from '@tryghost/admin-x-framework/api/post-contract';
import { DEFAULT_TITLE, type SaveEngineState } from '@/editor/engine/save-engine';
import type { LexicalInput } from '@/editor/engine/lexical-compare';
import type { PostType } from '@/editor/card-config';
import { createEditorSession, type EditorSession, type EditorWritePayload } from './editor-session';
import type { EditorRecord } from './projection';

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
  isDirty: () => boolean;
  dispatchExplicit: () => void;
  reauthSucceeded: () => void;
  reauthAbandoned: () => void;
}

export interface UseEditorSessionOptions {
  postType: PostType;
  record?: EditorRecord;
}

function reportError(error: unknown): void {
  // eslint-disable-next-line no-console
  console.error(error);
  Sentry.captureException(error);
}

export function useEditorSession({
  postType,
  record,
}: UseEditorSessionOptions): EditorSessionHandle {
  const navigate = useNavigate();
  const sessionKey = useEditorSessionKey();
  const generateSlug = useGenerateSlug();
  const { data: site } = useBrowseSite();
  const { mutateAsync: addPost } = useAddPost();
  const { mutateAsync: editPost } = useEditPost();
  const { mutateAsync: addPage } = useAddPage();
  const { mutateAsync: editPage } = useEditPage();

  const [persistedId, setPersistedId] = useState<string | null>(record?.id ?? null);
  const [title, setTitle] = useState(() =>
    record?.title === DEFAULT_TITLE ? '' : (record?.title ?? ''),
  );
  const [excerpt, setExcerpt] = useState(() => record?.custom_excerpt ?? '');
  const [initialLexical] = useState(() => record?.lexical ?? null);

  const transport = useRef({ addPost, editPost, addPage, editPage, generateSlug, postType });
  useEffect(() => {
    transport.current = { addPost, editPost, addPage, editPage, generateSlug, postType };
  });

  const [session] = useState<EditorSession>(() =>
    createEditorSession({
      record,
      siteUrl: site?.site.url,
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
          transport.current.generateSlug({ type: 'post', text, id: postId ?? undefined }),
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
  });
  const pageQuery = useEditorPage(persistedId ?? '', {
    enabled: postType === 'page' && !!persistedId,
    defaultErrorHandler: false,
  });
  const saved = postType === 'page' ? pageQuery.data?.pages[0] : postQuery.data?.posts[0];

  useEffect(() => {
    if (saved) {
      session.recordRefetched(saved);
    }
  }, [saved, session]);

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
    isDirty: session.isDirty,
    dispatchExplicit: () => void session.dispatchExplicit(),
    reauthSucceeded: session.reauthSucceeded,
    reauthAbandoned: session.reauthAbandoned,
  };
}
