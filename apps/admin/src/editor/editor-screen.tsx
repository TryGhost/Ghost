import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { AdminLink } from '@/shared/admin-link';
import { NotFound } from '@/shared/not-found';
import { Navigate, useNavigate, useParams } from '@tryghost/admin-x-framework';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import {
  type PageEditorRecord,
  useEditPage,
  useEditorPage,
} from '@tryghost/admin-x-framework/api/pages';
import {
  type PostEditorRecord,
  useEditPost,
  useEditorPost,
} from '@tryghost/admin-x-framework/api/posts';
import {
  type User,
  isAdminUser,
  isAuthorOrContributor,
  isContributorUser,
  isEditorUser,
  isOwnerUser,
} from '@tryghost/admin-x-framework/api/users';
import type { CardConfigPostSource, PostCardConfig, PostType } from './card-config';
import { EditorStatus } from './editor-status';
import { PostEditor } from './post-editor';
import type { EditorStatusNewsletter, EditorStatusRecord } from './post-status';
import { SessionBanners } from './session/session-banners';
import { useFeatureImageBinding } from './session/feature-image-binding';
import { EDITOR_REQUEST_OPTIONS } from './request-options';
import { useEditorSession, useEditorSessionKey } from './session/use-editor-session';
import { usePostCardConfig } from './use-post-card-config';
import { usePostSnippets } from './use-post-snippets';
import { useSaveShortcut } from './use-save-shortcut';

type EditorRecord = PostEditorRecord | PageEditorRecord;

function EditorLoading() {
  return (
    <Stack align="center" className="h-full" justify="center">
      <LoadingIndicator size="lg" />
    </Stack>
  );
}

function EditorLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Stack align="center" className="h-full" data-testid="editor-load-error" justify="center">
      <Text tone="secondary">{message}</Text>
      <Button variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </Stack>
  );
}

function EditorHeader({ postType, children }: { postType: PostType; children?: ReactNode }) {
  const listLabel = postType === 'page' ? 'Pages' : 'Posts';

  return (
    <Inline className="shrink-0 px-4 py-3" gap="sm">
      <Button size="sm" variant="ghost" asChild>
        <AdminLink to={postType === 'page' ? '/pages' : '/posts'}>
          <LucideIcon.ArrowLeft />
          {listLabel}
        </AdminLink>
      </Button>
      {children}
    </Inline>
  );
}

// A created post has no loaded record yet, but it is no longer new.
function statusRecordOf(
  record: EditorRecord | undefined,
  createdId?: string,
): EditorStatusRecord | undefined {
  if (!record) {
    return createdId ? { status: 'draft' } : undefined;
  }

  const email = 'email' in record ? record.email : null;
  // The API types the relation as a bare object; the editor read includes it.
  const newsletter =
    'newsletter' in record ? (record.newsletter as EditorStatusNewsletter | null) : null;

  return {
    status: record.status,
    publishedAt: record.published_at,
    url: record.url,
    emailOnly: 'email_only' in record ? record.email_only : false,
    newsletter,
    emailSegment: 'email_segment' in record ? record.email_segment : null,
    hasEmail: !!email,
    emailStatus: email?.status ?? null,
    emailCount: email?.email_count ?? 0,
  };
}

interface EditorContentProps {
  postType: PostType;
  record?: EditorRecord;
  createdId?: string;
  cardConfig: PostCardConfig;
  showExcerpt: boolean;
  snippetDialog: ReactNode;
}

// Mounted only once the boot data has resolved: the session reads the site URL
// when it is built, and normalization cannot be switched on afterwards.
function EditorContent({
  postType,
  record,
  createdId,
  cardConfig,
  showExcerpt,
  snippetDialog,
}: EditorContentProps) {
  const session = useEditorSession({ postType, record });
  const featureImage = useFeatureImageBinding(session, record);

  useSaveShortcut(session.dispatchExplicit);

  return (
    <Stack className="h-full" gap="none">
      <EditorHeader postType={postType}>
        <EditorStatus
          isDirty={session.isDirty()}
          record={statusRecordOf(record, createdId)}
          state={session.state}
        />
      </EditorHeader>
      <SessionBanners
        state={session.state}
        onDismissReauth={session.reauthAbandoned}
        onRetryReauth={session.reauthSucceeded}
        onRetrySave={session.dispatchExplicit}
      />
      <div className="min-h-0 flex-1">
        <PostEditor
          {...session.bind}
          autofocusTitle={!record}
          cardConfig={cardConfig}
          featureImage={featureImage}
          postType={postType}
          showExcerpt={showExcerpt}
        />
      </div>
      {snippetDialog}
    </Stack>
  );
}

function EditorSurface({
  postType,
  record,
  createdId,
}: {
  postType: PostType;
  record?: EditorRecord;
  createdId?: string;
}) {
  const { data: currentUser } = useCurrentUser();
  const showExcerpt = useFeatureFlag('editorExcerpt');

  const canManageSnippets =
    !!currentUser &&
    (isOwnerUser(currentUser) || isAdminUser(currentUser) || isEditorUser(currentUser));
  const { snippets, createSnippet, deleteSnippet, snippetDialog } = usePostSnippets({
    canManage: canManageSnippets,
  });

  const [cardConfigPost] = useState<CardConfigPostSource>(() => ({
    displayName: postType,
    showTitleAndFeatureImage:
      record && 'show_title_and_feature_image' in record
        ? record.show_title_and_feature_image
        : undefined,
    visibility: record?.visibility,
  }));
  const cardConfig = usePostCardConfig({
    post: cardConfigPost,
    snippets,
    createSnippet,
    deleteSnippet,
  });

  if (!cardConfig) {
    return <EditorLoading />;
  }

  return (
    <EditorContent
      cardConfig={cardConfig}
      createdId={createdId}
      postType={postType}
      record={record}
      showExcerpt={showExcerpt}
      snippetDialog={snippetDialog}
    />
  );
}

// The API returns posts the user cannot edit, so authorship is checked here
function shouldReturnToList(user: User, record: EditorRecord): boolean {
  const isAuthored = record.authors?.some((author) => author.id === user.id) ?? false;

  if (isAuthorOrContributor(user) && !isAuthored) {
    return true;
  }

  return isContributorUser(user) && record.status !== 'draft';
}

interface ConversionState {
  id: string;
  record?: EditorRecord;
  error?: unknown;
}

// Mobiledoc content is converted server-side before the editor opens it
function useLexicalConversion(postType: PostType) {
  const { mutateAsync: editPost } = useEditPost();
  const { mutateAsync: editPage } = useEditPage();
  const [state, setState] = useState<ConversionState | null>(null);

  const convert = useCallback(
    async (source: EditorRecord) => {
      const payload = { id: source.id, updated_at: source.updated_at };
      const options = { convertToLexical: true };
      setState({ id: source.id });

      try {
        const record: EditorRecord | undefined =
          postType === 'page'
            ? (await editPage({ page: payload, options })).pages[0]
            : (await editPost({ post: payload, options })).posts[0];
        setState(record ? { id: source.id, record } : { id: source.id, error: true });
      } catch (error) {
        setState({ id: source.id, error });
      }
    },
    [editPage, editPost, postType],
  );

  return { state, convert };
}

function EditorLoader({ postType, id }: { postType: PostType; id?: string }) {
  // A create replaces the URL with the id it acquired; the load must not restart.
  const [openedId] = useState(id);
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const postQuery = useEditorPost(openedId ?? '', {
    enabled: postType === 'post' && !!openedId,
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const pageQuery = useEditorPage(openedId ?? '', {
    enabled: postType === 'page' && !!openedId,
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const query = postType === 'page' ? pageQuery : postQuery;
  const loaded: EditorRecord | undefined =
    postType === 'page' ? pageQuery.data?.pages[0] : postQuery.data?.posts[0];
  const { state: conversion, convert } = useLexicalConversion(postType);
  const listPath = postType === 'page' ? '/pages' : '/posts';

  const returnToList = !!currentUser && !!loaded && shouldReturnToList(currentUser, loaded);
  useEffect(() => {
    if (returnToList) {
      navigate(listPath, { replace: true });
    }
  }, [returnToList, navigate, listPath]);

  const needsConversion = !!currentUser && !!loaded?.mobiledoc && !loaded.lexical && !returnToList;
  useEffect(() => {
    if (needsConversion && loaded && conversion?.id !== loaded.id) {
      void convert(loaded);
    }
  }, [needsConversion, loaded, conversion?.id, convert]);

  if (!openedId) {
    return <EditorSurface createdId={id} postType={postType} />;
  }

  const notFound = query.error instanceof APIError && query.error.response?.status === 404;
  if (notFound) {
    return <NotFound />;
  }

  if (query.error) {
    return (
      <EditorLoadError
        message={`Couldn’t load this ${postType}.`}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (query.isPending || !currentUser || returnToList) {
    return <EditorLoading />;
  }

  if (!loaded) {
    return <NotFound />;
  }

  let record = loaded;
  if (needsConversion) {
    const converted = conversion?.id === loaded.id ? conversion : undefined;

    if (converted?.error) {
      return (
        <EditorLoadError
          message={`Couldn’t convert this ${postType} for editing.`}
          onRetry={() => void convert(loaded)}
        />
      );
    }

    if (!converted?.record) {
      return <EditorLoading />;
    }

    record = converted.record;
  }

  return <EditorSurface postType={postType} record={record} />;
}

export default function EditorScreen() {
  const editorPath = useParams()['*'] ?? '';
  const sessionKey = useEditorSessionKey();
  const [typeSegment, id, ...rest] = editorPath.split('/').filter(Boolean);

  if (!typeSegment) {
    return <Navigate to="/editor/post" replace />;
  }

  if ((typeSegment !== 'post' && typeSegment !== 'page') || rest.length > 0) {
    return <NotFound />;
  }

  return <EditorLoader key={sessionKey} id={id} postType={typeSegment} />;
}
