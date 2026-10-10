import { getListReturnNavigationState } from '@/shared/virtual-list';
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
import { useQueryClient } from '@tanstack/react-query';
import { AdminLink } from '@/shared/admin-link';
import { getPostListReturnUrl } from '@/posts/api';
import { reloadAdmin } from '@/auth/api';
import { NotFound } from '@/shared/not-found';
import { Navigate, useLocation, useNavigate, useParams } from '@tryghost/admin-x-framework';
import { Button } from '@tryghost/shade/components';
import { DirtyConfirmDialog, PageHeader } from '@tryghost/shade/patterns';
import { Box, Grid, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { APIError, SessionExpiredError } from '@tryghost/admin-x-framework/errors';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useEditPage, useEditorPage } from '@tryghost/admin-x-framework/api/pages';
import { useEditPost, useEditorPost } from '@tryghost/admin-x-framework/api/posts';
import { useBrowseTiers } from '@tryghost/admin-x-framework/api/tiers';
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
import { EditorHeaderActions, type OpenFlow } from './editor-header-actions';
import { readEditorReturn } from './editor-return';
import { EditorLoading } from './editor-loading';
import { ScreenEntranceProvider } from '@/layout/screen-entrance-provider';
import { useScreenEntrance } from '@/layout/screen-transition';
import { EditorStatus } from './editor-status';
import { EmailSizeWarning } from './email-size-warning';
import { PostEditor, type PostEditorHandle } from './post-editor';
import type { EditorStatusRecord } from './post-status';
import { buildPublishFlowPost } from './publish/flow-post';
import { PAID_TIERS_SEARCH_PARAMS } from './browse-params';
import { initialEmailError } from './publish/use-publish-flow';
import { SessionBanners } from './session/session-banners';
import { type InvalidField, settingsFieldErrorFor, titleError } from './session/settings-fields';
import { ReauthDialog } from './session/reauth-dialog';
import { PostSettingsSidebar, type SettingsFieldReveal } from './settings/post-settings-sidebar';
import { isSettingsPanelField } from './settings/sections';
import { useFeatureImageBinding } from './session/feature-image-binding';
import { EDITOR_REQUEST_OPTIONS } from './request-options';
import { useEditorLeaveGuard } from './session/use-leave-guard';
import {
  EditorSessionCreatedProvider,
  EditorSessionKeyProvider,
  useEditorScreenSessionKey,
} from './session/session-key';
import { editorRead, useEditorSession } from './session/use-editor-session';
import { usePostCardConfig } from './use-post-card-config';
import { usePostSnippets } from './use-post-snippets';
import type { EditorRecord } from './session/projection';

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

function EditorHeader({
  postType,
  analyticsReturn,
  children,
}: {
  postType: PostType;
  analyticsReturn?: string;
  children?: ReactNode;
}) {
  const listLabel = postType === 'page' ? 'Pages' : 'Posts';
  const resource = postType === 'page' ? 'pages' : 'posts';
  const listUrl = getPostListReturnUrl(resource);
  const backLabel = analyticsReturn ? 'Analytics' : listLabel;

  return (
    <Grid
      align="start"
      className="grid-cols-[auto_minmax(0,1fr)_auto] pt-[calc(var(--spacing)*5+1px)] pr-[calc(var(--spacing)*(4+2*var(--editor-settings-progress,0)))] pb-3 pl-4 editor-settings-motion-[padding-right] max-[500px]:pt-3 max-[500px]:pr-[calc(var(--spacing)*(1+2*var(--editor-settings-progress,0))-1px)] max-[500px]:pl-3 [&_a]:pointer-events-auto [&_button]:pointer-events-auto"
      gap="sm"
    >
      <PageHeader.Action
        className="bg-background/80 backdrop-blur-sm max-[500px]:aspect-square max-[500px]:gap-0 max-[500px]:px-0"
        fallbackSize="sm"
        fallbackVariant="ghost"
        label={backLabel}
        asChild
      >
        {analyticsReturn ? (
          <AdminLink to={analyticsReturn}>
            <LucideIcon.ArrowLeft />
            <span className="max-[500px]:sr-only">{backLabel}</span>
          </AdminLink>
        ) : (
          <AdminLink state={getListReturnNavigationState(listUrl)} to={listUrl}>
            <LucideIcon.ArrowLeft />
            <span className="max-[500px]:sr-only">{backLabel}</span>
          </AdminLink>
        )}
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
  const chromeEntrance = useScreenEntrance();
  const [openFlow, setOpenFlow] = useState<OpenFlow>('none');
  const openPublishFlow = useCallback(() => setOpenFlow('publish'), []);
  const openUpdateFlow = useCallback(() => setOpenFlow('update'), []);
  // Only reads what the sidebar's tier picker loaded, which names a tier picked before its save lands.
  const { data: tiersData } = useBrowseTiers({
    defaultErrorHandler: false,
    enabled: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
    searchParams: PAID_TIERS_SEARCH_PARAMS,
  });
  const publishPost = buildPublishFlowPost({
    snapshot: {
      id: session.persistedId,
      status: session.publishTime.status,
      publishedAt: session.publishTime.publishedAt,
      title: session.title,
    },
    record: session.loadedRecord,
    access: session.settings,
    knownTiers: tiersData?.tiers,
    displayName: postType,
    lexical: session.getLiveLexical(),
  });
  // Core refuses an email retry to Authors and Contributors.
  const offersEmailRetry =
    !!currentUser && !isAuthorOrContributor(currentUser) && !!initialEmailError(publishPost);
  // The update flow is mounted with the publish controls, which Contributors never get.
  const canPublish = !!currentUser && !isContributorUser(currentUser);
  const location = useLocation();
  const analyticsReturn = record ? readEditorReturn(location.state) : undefined;
  const statusRecord = statusRecordOf(session.loadedRecord ?? record, createdId);
  const didEmailFail =
    postType === 'post' &&
    (statusRecord?.status === 'published' || statusRecord?.status === 'sent') &&
    statusRecord.emailStatus === 'failed';
  // Closed on every editor entry, as the menu it replaces was.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPresent, setSettingsPresent] = useState(false);
  const [settingsReveal, setSettingsReveal] = useState<SettingsFieldReveal | null>(null);
  // From a toggle until everything moving with the panel has arrived. Meanwhile
  // the editor sizes Koenig's breakout cards from the moving layout.
  const [settingsMoving, setSettingsMoving] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const settingsFrameRef = useRef<HTMLDivElement>(null);
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
  // Keep the panel's fields and subview mounted until its closing transition ends.
  // Reading the panel's own transitions also handles reduced motion (none) and
  // reversals (a reopen cancels this wait).
  useLayoutEffect(() => {
    if (settingsOpen || !settingsPresent) {
      return;
    }
    const finishClosing = () => {
      setSettingsPresent(false);
    };
    const animations =
      settingsFrameRef.current
        ?.getAnimations()
        .filter((animation) => animation instanceof CSSTransition) ?? [];
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
  // Reading the shell's transitions also flushes the style that starts them; a
  // reversal replaces them and cancels this wait.
  useLayoutEffect(() => {
    if (!settingsMoving) {
      return;
    }
    const transitions =
      shellRef.current
        ?.getAnimations({ subtree: true })
        .filter((animation) => animation instanceof CSSTransition) ?? [];
    let cancelled = false;
    void Promise.allSettled(transitions.map((transition) => transition.finished)).then(() => {
      if (!cancelled) {
        setSettingsMoving(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [settingsOpen, settingsMoving]);
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
    // A manual toggle ends the reveal, so reopening starts on the section list.
    setSettingsReveal(null);
    setSettingsMoving(true);
    setSettingsPresent(true);
    setSettingsOpen((open) => !open);
  }, []);
  const postEditorRef = useRef<PostEditorHandle>(null);
  // Below the small breakpoint the header's controls sit in the editor's bottom bar.
  const [bottomBar, setBottomBar] = useState<HTMLDivElement | null>(null);
  /**
   * Takes the writer to the first field an explicit save would refuse, as the
   * save's own validator reads it, and returns that field. The email subject is
   * edited in the preview, which the caller opens.
   */
  const revealInvalidField = useCallback((): InvalidField | null => {
    const invalid = session.invalidField();
    if (!invalid) {
      return null;
    }
    const { key } = invalid;
    if (key === 'title') {
      postEditorRef.current?.focusTitle();
    } else if (key === 'custom_excerpt' && showExcerpt) {
      postEditorRef.current?.focusExcerpt();
    } else if (isSettingsPanelField(key)) {
      // The panel shows the field's section, opening its pane, and focuses it.
      if (!settingsOpen) {
        setSettingsMoving(true);
        setSettingsPresent(true);
        setSettingsOpen(true);
      }
      setSettingsReveal({ field: key });
    }
    return invalid;
  }, [session, settingsOpen, showExcerpt]);
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
    <Stack className="h-full min-h-0" gap="none">
      {/* Session warnings sit above the header, so the header row and the
          settings toggle floating on it move down together. */}
      <Box className="shrink-0">
        <SessionBanners
          contentText={session.contentText}
          hasUnsavedContent={session.hasUnsavedContent}
          newerVersionAvailable={session.newerVersionAvailable}
          pendingSave={session.pendingSave}
          state={session.state}
          onReload={session.reload}
        />
        <ReauthDialog
          email={currentUser?.email ?? ''}
          open={session.reauthOpen}
          onAbandoned={session.reauthAbandoned}
          onSucceeded={session.reauthSucceeded}
        />
      </Box>
      <Inline
        ref={shellRef}
        align="stretch"
        className="relative min-h-0 flex-1 [--editor-settings-width:350px] max-[500px]:[--editor-settings-width:100vw]"
        gap="none"
        style={
          {
            '--editor-overlap': `${headerHeight}px`,
            // Never animated: what moves with the panel transitions its own property.
            '--editor-settings-progress': settingsOpen ? 1 : 0,
            // Unset until measured: the toggle's slot then starts at auto width, which
            // nothing eases from, rather than easing out from an unmeasured toggle.
            '--editor-settings-toggle-width': settingsToggleWidth
              ? `${settingsToggleWidth}px`
              : undefined,
          } as CSSProperties
        }
      >
        <Stack className="min-h-0 min-w-0 flex-1" gap="none">
          <Box
            ref={headerRef}
            className={cn(
              'screen-exit-chrome-top pointer-events-none relative z-20 shrink-0',
              chromeEntrance && 'screen-enter-from-top',
            )}
          >
            <EditorHeader analyticsReturn={analyticsReturn} postType={postType}>
              {!analyticsReturn || didEmailFail || session.state.kind === 'error' ? (
                <EditorStatus
                  isDirty={session.isDirty()}
                  pendingSave={session.pendingSave}
                  record={statusRecord}
                  state={session.state}
                  onOpenPublishFlow={offersEmailRetry ? openPublishFlow : undefined}
                  onOpenUpdateFlow={canPublish ? openUpdateFlow : undefined}
                  onRetrySave={session.retrySave}
                />
              ) : null}
              <PageHeader.ActionGroup className="col-start-3 ml-auto gap-x-[calc(var(--spacing)*3*(1-var(--editor-settings-progress)))] editor-settings-motion-[column-gap]">
                <EditorHeaderActions
                  bottomBar={bottomBar}
                  currentUser={currentUser}
                  offersEmailRetry={offersEmailRetry}
                  openFlow={openFlow}
                  post={publishPost}
                  postType={postType}
                  revealInvalidField={revealInvalidField}
                  session={session}
                  siteUrl={cardConfig.siteUrl}
                  tkCount={tkCount}
                  onOpenFlow={setOpenFlow}
                />
                <Box
                  aria-hidden="true"
                  className="w-[calc((var(--editor-settings-toggle-width)+var(--spacing)*2+1px)*(1-var(--editor-settings-progress)))] shrink-0 editor-settings-motion-[width]"
                />
              </PageHeader.ActionGroup>
            </EditorHeader>
          </Box>
          {/* The document reaches up behind the floating header. */}
          <Box className="relative min-h-0 flex-1">
            <div className="-mt-(--editor-overlap) h-[calc(100%+var(--editor-overlap))] min-h-0">
              <PostEditor
                key={session.contentKey}
                {...session.bind}
                actionsSlotRef={setBottomBar}
                autofocusTitle={!record}
                cardConfig={currentCardConfig}
                excerptError={settingsFieldErrorFor('custom_excerpt', session.settings)}
                featureImage={featureImage}
                handleRef={postEditorRef}
                postType={postType}
                settingsMoving={settingsMoving}
                showExcerpt={showExcerpt}
                titleAndFeatureImageHidden={
                  postType === 'page' && liveShowTitleAndFeatureImage === false
                }
                titleError={titleError(session.bind.title)}
                wordCountAccessory={<EmailSizeWarning post={publishPost} />}
                onExcerptBlur={session.commitField}
                onTkCountChange={setTkCount}
              />
            </div>
          </Box>
        </Stack>
        <Box
          className={cn(
            'screen-exit-chrome-top absolute top-[calc(var(--spacing)*5+1px)] right-[calc(var(--spacing)*6+1px)] z-40 max-[500px]:top-3 max-[500px]:right-3',
            chromeEntrance && 'screen-enter-from-top',
          )}
        >
          {settingsToggle}
        </Box>
        {settingsPresent ? (
          <PostSettingsSidebar
            cardConfig={currentCardConfig}
            currentUser={currentUser}
            featureImage={featureImage.featureImage}
            frameRef={settingsFrameRef}
            hasInlineExcerpt={showExcerpt}
            postType={postType}
            reveal={settingsReveal}
            session={session}
            siteUrl={cardConfig.siteUrl}
          />
        ) : null}
        {snippetDialog}
        <DirtyConfirmDialog testId={editorLeaveDialog} {...leaveGuard.dialogProps} />
      </Inline>
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
  const { cardConfig, failed, retry } = usePostCardConfig({
    post: cardConfigPost,
    snippets,
    createSnippet,
    deleteSnippet,
  });

  if (!cardConfig) {
    return failed ? (
      <EditorLoadError message="Couldn’t load the editor." onRetry={retry} />
    ) : (
      <EditorLoading />
    );
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
  // Access and conversion are judged on the read the post opens with. Later
  // reads belong to the session; unmounting the editor would dispose it.
  const [openedWith, setOpenedWith] = useState<EditorRecord>();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser({ requestOptions: EDITOR_REQUEST_OPTIONS });
  // Mounting never refetches a cached copy: the loader sends that read itself, below.
  const postQuery = useEditorPost(openedId ?? '', {
    enabled: postType === 'post' && !!openedId,
    defaultErrorHandler: false,
    refetchOnMount: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const pageQuery = useEditorPage(openedId ?? '', {
    enabled: postType === 'page' && !!openedId,
    defaultErrorHandler: false,
    refetchOnMount: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const query = postType === 'page' ? pageQuery : postQuery;
  const loaded: EditorRecord | undefined =
    postType === 'page' ? pageQuery.data?.pages[0] : postQuery.data?.posts[0];
  const { state: conversion, convert } = useLexicalConversion(postType);
  const listPath = postType === 'page' ? '/pages' : '/posts';

  // Opening reads the post again even when a copy is cached: the session saves
  // against the version it opens on, so a copy from an earlier visit would collide
  // with whatever another writer has saved since. A read still in flight from that
  // visit may have been answered before their save, so it is replaced, not joined,
  // even when it is that visit's first. With neither, mounting loads the post.
  const [earlierVisit] = useState<'cached' | 'reading' | null>(() => {
    if (query.data !== undefined) {
      return 'cached';
    }
    const inFlight =
      !!openedId &&
      queryClient.getQueryState(editorRead(postType, openedId).queryKey)?.fetchStatus ===
        'fetching';
    return inFlight ? 'reading' : null;
  });
  const [openingReadSettled, setOpeningReadSettled] = useState(false);
  const openingReadStarted = useRef(false);
  useEffect(() => {
    if (!earlierVisit || !openedId || openingReadStarted.current) {
      return;
    }
    openingReadStarted.current = true;
    const read = async () => {
      // With nothing cached, a refetch would join the read in flight.
      if (earlierVisit === 'reading') {
        await queryClient.cancelQueries({
          queryKey: editorRead(postType, openedId).queryKey,
          exact: true,
        });
      }
      await query.refetch({ cancelRefetch: true });
      setOpeningReadSettled(true);
    };
    void read();
  });
  // Settled once the read this mount sent has succeeded or failed. An earlier
  // visit's read landing before that one starts does not count, and a later
  // refetch, such as the one a conversion's save starts, does not hold it back.
  const opened = earlierVisit ? openingReadSettled : query.isFetchedAfterMount;

  // Only the opening read's own failure counts, never one a cached copy still
  // carries. A deleted post or an expired session decides the screen even with a
  // copy cached; any other failure opens that copy, and the next save reports the rest.
  const readError = opened ? query.error : null;
  const definitive =
    readError instanceof SessionExpiredError ||
    (readError instanceof APIError && readError.response?.status === 404);
  const loadError = openedWith || (loaded && !definitive) ? null : readError;
  // Reloading is safe only while nothing is unsaved: the signed-out admin
  // remembers this route and returns to it after sign in.
  const sessionExpired = loadError instanceof SessionExpiredError;
  useEffect(() => {
    if (sessionExpired) {
      reloadAdmin(`${pathname}${search}`);
    }
  }, [sessionExpired, pathname, search]);

  // Nothing is judged on a cached copy before the opening read settles, nor on one
  // that read has ruled out.
  const opening = openedWith || !opened || definitive ? undefined : loaded;
  const returnToList = !!currentUser && !!opening && shouldReturnToList(currentUser, opening);
  useEffect(() => {
    if (returnToList) {
      navigate(listPath, { replace: true });
    }
  }, [returnToList, navigate, listPath]);

  const needsConversion =
    !!currentUser && !!opening?.mobiledoc && !opening.lexical && !returnToList;
  useEffect(() => {
    if (needsConversion && opening && conversion?.id !== opening.id) {
      void convert(opening);
    }
  }, [needsConversion, opening, conversion?.id, convert]);

  if (!openedId) {
    return <EditorSurface createdId={id} postType={postType} />;
  }

  if (openedWith) {
    return <EditorSurface postType={postType} record={openedWith} />;
  }

  const notFound = loadError instanceof APIError && loadError.response?.status === 404;
  if (notFound) {
    return <NotFound />;
  }

  if (sessionExpired) {
    return <EditorLoading />;
  }

  if (loadError) {
    return (
      <EditorLoadError
        message={`Couldn’t load this ${postType}.`}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (!opened || query.isPending || !currentUser || returnToList) {
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

  // Latched while rendering, now the opening read has settled. A cached copy only
  // gets this far when that read failed for a reason other than the two above.
  setOpenedWith(record);
  return <EditorSurface postType={postType} record={record} />;
}

export default function EditorScreen() {
  const editorPath = useParams()['*'] ?? '';
  const { key: sessionKey, markCreated } = useEditorScreenSessionKey();
  const [typeSegment, id, ...rest] = editorPath.split('/').filter(Boolean);

  if (!typeSegment) {
    return <Navigate to="/editor/post" replace />;
  }

  if ((typeSegment !== 'post' && typeSegment !== 'page') || rest.length > 0) {
    return <NotFound />;
  }

  return (
    <EditorSessionKeyProvider value={sessionKey}>
      <EditorSessionCreatedProvider value={markCreated}>
        <ScreenEntranceProvider key={sessionKey}>
          <EditorLoader id={id} postType={typeSegment} />
        </ScreenEntranceProvider>
      </EditorSessionCreatedProvider>
    </EditorSessionKeyProvider>
  );
}
