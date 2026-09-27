import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AdminLink } from '@/shared/admin-link';
import { NotFound } from '@/shared/not-found';
import { Navigate, useNavigate, useParams } from '@tryghost/admin-x-framework';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
import { DirtyConfirmDialog, PageHeader } from '@tryghost/shade/patterns';
import { Box, Grid, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useEditPage, useEditorPage } from '@tryghost/admin-x-framework/api/pages';
import { useEditPost, useEditorPost } from '@tryghost/admin-x-framework/api/posts';
import {
  type User,
  isAdminUser,
  isAuthorOrContributor,
  isContributorUser,
  isEditorUser,
  isOwnerUser,
} from '@tryghost/admin-x-framework/api/users';
import {
  editorLeaveDialog,
  editorLoadError,
  settingsMenuToggle,
} from '@tryghost/test-data/selectors/editor';
import {
  type CardConfigPostSource,
  type PostCardConfig,
  type PostType,
  withLiveSettings,
} from './card-config';
import { EditorHeaderActions } from './editor-header-actions';
import { EditorStatus } from './editor-status';
import { PostEditor } from './post-editor';
import type { EditorStatusRecord } from './post-status';
import { SessionBanners } from './session/session-banners';
import { PostSettingsSidebar } from './settings/post-settings-sidebar';
import { useFeatureImageBinding } from './session/feature-image-binding';
import { EDITOR_REQUEST_OPTIONS } from './request-options';
import { useEditorLeaveGuard } from './session/use-leave-guard';
import { useEditorSession, useEditorSessionKey } from './session/use-editor-session';
import { usePostCardConfig } from './use-post-card-config';
import { usePostSnippets } from './use-post-snippets';
import { useSaveShortcut } from './use-editor-shortcuts';
import type { EditorRecord } from './session/projection';

function EditorLoading() {
  return (
    <Stack align="center" className="h-full" justify="center">
      <LoadingIndicator size="lg" />
    </Stack>
  );
}

function EditorLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Stack align="center" className="h-full" data-testid={editorLoadError} justify="center">
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
    <Grid
      align="center"
      className="grid-cols-[auto_minmax(0,1fr)] pt-[calc(var(--spacing)*5+1px)] pr-[calc(var(--spacing)*(4+2*var(--editor-settings-progress,0)))] pb-3 pl-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] [&_a]:pointer-events-auto [&_button]:pointer-events-auto"
      gap="sm"
    >
      <PageHeader.Action
        className="bg-background/80 backdrop-blur-sm"
        fallbackSize="sm"
        fallbackVariant="ghost"
        label={listLabel}
        asChild
      >
        <AdminLink to={postType === 'page' ? '/pages' : '/posts'}>
          <LucideIcon.ArrowLeft />
          {listLabel}
        </AdminLink>
      </PageHeader.Action>
      {children}
    </Grid>
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
  const newsletter = 'newsletter' in record ? (record.newsletter ?? null) : null;

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
  currentUser?: User;
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
  currentUser,
  showExcerpt,
  snippetDialog,
}: EditorContentProps) {
  const session = useEditorSession({
    postType,
    record,
    siteUrl: cardConfig.siteUrl,
    currentUserId: currentUser?.id,
  });
  const [tkCount, setTkCount] = useState(0);
  // Closed on every editor entry, as the menu it replaces was.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPresent, setSettingsPresent] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const settingsToggleRef = useRef<HTMLButtonElement>(null);
  const [settingsToggleWidth, setSettingsToggleWidth] = useState(0);
  useLayoutEffect(() => {
    const toggle = settingsToggleRef.current;
    if (!toggle) {
      return;
    }
    const measure = () => setSettingsToggleWidth(toggle.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(toggle);
    return () => observer.disconnect();
  }, []);
  // Keep the panel's fields and subview mounted until the closing transition ends.
  // Reading animations also handles reduced motion (no animation) and reversals.
  useLayoutEffect(() => {
    if (settingsOpen || !settingsPresent) {
      return;
    }
    const finishClosing = () => {
      setSettingsPresent(false);
    };
    const animations = shellRef.current?.getAnimations() ?? [];
    if (!animations.length) {
      finishClosing();
      return;
    }
    let cancelled = false;
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (!cancelled) {
        finishClosing();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [settingsOpen, settingsPresent]);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) {
      return;
    }
    const measure = () => setHeaderHeight(header.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  const toggleSettings = useCallback(() => {
    settingsToggleRef.current?.focus();
    setSettingsPresent(true);
    setSettingsOpen((open) => !open);
  }, []);
  const featureImage = useFeatureImageBinding(session, session.loadedRecord, session.contentKey);
  const leaveGuard = useEditorLeaveGuard(session, postType);
  const liveVisibility = session.settings.visibility;
  const liveShowTitleAndFeatureImage = session.settings.show_title_and_feature_image;
  const currentCardConfig = useMemo(
    () =>
      withLiveSettings(cardConfig, {
        visibility: liveVisibility,
        showTitleAndFeatureImage: liveShowTitleAndFeatureImage,
      }),
    [cardConfig, liveShowTitleAndFeatureImage, liveVisibility],
  );

  useSaveShortcut(session.dispatchExplicit);

  const settingsToggle = (
    <PageHeader.Action
      ref={settingsToggleRef}
      aria-expanded={settingsOpen}
      className={
        settingsOpen
          ? 'bg-transparent enabled:aria-expanded:bg-transparent enabled:aria-expanded:shadow-none enabled:aria-expanded:hover:bg-sidebar-accent'
          : 'bg-background/80 backdrop-blur-sm'
      }
      data-testid={settingsMenuToggle}
      fallbackSize="sm"
      fallbackVariant="ghost"
      label="Settings"
      tooltip={false}
      iconOnly
      onClick={toggleSettings}
    >
      <LucideIcon.PanelRight />
    </PageHeader.Action>
  );

  return (
    <Inline
      ref={shellRef}
      align="stretch"
      className="relative h-full min-h-0 transition-[--editor-settings-progress] duration-450 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
      gap="none"
      style={
        {
          '--editor-header-height': `${headerHeight}px`,
          '--editor-overlap': '0px',
          '--editor-settings-progress': settingsOpen ? 1 : 0,
          '--editor-settings-toggle-width': `${settingsToggleWidth}px`,
        } as CSSProperties
      }
    >
      <Stack className="min-h-0 min-w-0 flex-1" gap="none">
        <Box ref={headerRef} className="pointer-events-none relative z-20 shrink-0">
          <EditorHeader postType={postType}>
            <EditorStatus
              isDirty={session.isDirty()}
              record={statusRecordOf(session.loadedRecord ?? record, createdId)}
              state={session.state}
            />
            <PageHeader.ActionGroup className="ml-auto gap-x-[calc(var(--spacing)*3*(1-var(--editor-settings-progress)))] max-sm:col-start-2 max-sm:row-start-1">
              <EditorHeaderActions
                currentUser={currentUser}
                postType={postType}
                session={session}
                siteUrl={cardConfig.siteUrl}
                tkCount={tkCount}
              />
              <Box
                aria-hidden="true"
                className="w-[calc((var(--editor-settings-toggle-width)+var(--spacing)*2+1px)*(1-var(--editor-settings-progress)))] shrink-0"
              />
            </PageHeader.ActionGroup>
          </EditorHeader>
        </Box>
        <Box className="peer shrink-0">
          <SessionBanners
            contentText={session.contentText}
            hasUnsavedContent={session.hasUnsavedContent}
            pendingSave={session.pendingSave}
            state={session.state}
            onDismissReauth={session.reauthAbandoned}
            onReload={session.reload}
            onRetryReauth={session.reauthSucceeded}
            onRetrySave={session.dispatchExplicit}
          />
        </Box>
        {/* Session warnings reserve space; otherwise the document reaches behind the header. */}
        <Box className="relative min-h-0 flex-1 peer-empty:[--editor-overlap:var(--editor-header-height)]">
          <div className="-mt-(--editor-overlap) h-[calc(100%+var(--editor-overlap))] min-h-0">
            <PostEditor
              key={session.contentKey}
              {...session.bind}
              autofocusTitle={!record}
              cardConfig={currentCardConfig}
              featureImage={featureImage}
              postType={postType}
              showExcerpt={showExcerpt}
              onExcerptBlur={session.commitSettings}
              onTkCountChange={setTkCount}
            />
          </div>
        </Box>
      </Stack>
      <Box className="absolute top-[calc(var(--spacing)*5+1px)] right-[calc(var(--spacing)*6+1px)] z-40">
        {settingsToggle}
      </Box>
      {settingsPresent ? (
        <PostSettingsSidebar
          cardConfig={currentCardConfig}
          currentUser={currentUser}
          featureImage={featureImage.featureImage}
          hasInlineExcerpt={showExcerpt}
          postType={postType}
          session={session}
          siteUrl={cardConfig.siteUrl}
        />
      ) : null}
      {snippetDialog}
      <DirtyConfirmDialog testId={editorLeaveDialog} {...leaveGuard.dialogProps} />
    </Inline>
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
  const { data: currentUser } = useCurrentUser({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const showExcerpt = useFeatureFlag('editorExcerpt', {
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });

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
      currentUser={currentUser}
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
            ? (await editPage({ page: payload, options, ...EDITOR_REQUEST_OPTIONS })).pages[0]
            : (await editPost({ post: payload, options, ...EDITOR_REQUEST_OPTIONS })).posts[0];
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
  const { data: currentUser } = useCurrentUser({ requestOptions: EDITOR_REQUEST_OPTIONS });
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
