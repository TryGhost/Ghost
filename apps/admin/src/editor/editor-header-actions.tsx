import { useCallback, useState } from 'react';
import { useEmberOwnedRouteMatcher } from '@/routes';
import { useNavigate } from '@tryghost/admin-x-framework';
import { Button } from '@tryghost/shade/components';
import { useShade } from '@tryghost/shade/app';
import { PageHeader } from '@tryghost/shade/patterns';
import { Inline, Text } from '@tryghost/shade/primitives';
import { getSettingValue } from '@tryghost/admin-x-framework/api/settings';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { isContributorUser, type User } from '@tryghost/admin-x-framework/api/users';
import {
  editorHeaderActions,
  editorPublishInputsError,
} from '@tryghost/test-data/selectors/editor';
import type { PostType } from './card-config';
import { EDITOR_REQUEST_OPTIONS } from './request-options';
import { PostPreviewModal, type PostPreviewModalProps } from './preview/post-preview-modal';
import { postPreviewUrl } from './preview/preview-url';
import { PublishFlowModal } from './publish/publish-flow-modal';
import { UpdateFlowModal } from './publish/update-flow-modal';
import type { PublishFlowPost } from './publish/flow-post';
import { describeCompletionFailure } from './publish/completion-message';
import { usePublishInputs } from './publish/use-publish-inputs';
import { usePublishLimits } from './publish/use-publish-limits';
import { useEditorSettings } from './use-editor-settings';
import type { EditorSessionHandle } from './session/use-editor-session';
import type { SaveCompletion } from './engine/save-engine';
import { usePreviewShortcut, usePublishShortcut, useSaveShortcut } from './use-editor-shortcuts';
import { useSaveButtonPhase, useSaveFeedback, type SaveButtonPhase } from './use-save-feedback';

export type OpenFlow = 'none' | 'publish' | 'update';

/** The preview's props short of Publish, which only the publish controls can supply. */
type HeaderPreviewProps = Omit<PostPreviewModalProps, 'onPublish' | 'publishDisabled'>;

const UPDATE_LABELS: Record<SaveButtonPhase, string> = {
  idle: 'Update',
  running: 'Updating...',
  success: 'Updated',
  failure: 'Retry',
};

const SAVE_LABELS: Record<SaveButtonPhase, string> = {
  idle: 'Save',
  running: 'Saving',
  success: 'Saved',
  failure: 'Retry',
};

/** Turns a save the caller depends on into a rejection the flow renders in place. */
async function requireSaved(pending: Promise<SaveCompletion>): Promise<void> {
  const completion = await pending;

  if (completion.kind === 'dropped' && completion.reason === 'clean') {
    return;
  }

  const failure = describeCompletionFailure(completion);

  if (failure) {
    throw new Error(failure.message);
  }
}

export interface EditorHeaderActionsProps {
  session: EditorSessionHandle;
  /** Built by the screen, which derives the status line's retry from it too. */
  post: PublishFlowPost;
  postType: PostType;
  currentUser?: User;
  siteUrl: string;
  /** Unresolved TK markers in the title, excerpt, body and feature image. */
  tkCount: number;
  /** Held by the screen, because the status line opens the publish flow too. */
  openFlow: OpenFlow;
  onOpenFlow: (flow: OpenFlow) => void;
  /** Whether the status line offers a failed send's retry, which needs the publish inputs. */
  offersEmailRetry: boolean;
}

/**
 * The editor header's publish and preview controls. Every write goes through
 * the session's engine; nothing here saves the post itself.
 */
export function EditorHeaderActions({
  session,
  post,
  postType,
  currentUser,
  siteUrl,
  tkCount,
  openFlow,
  onOpenFlow,
  offersEmailRetry,
}: EditorHeaderActionsProps) {
  const { isAdmin7 } = useShade();
  const { persistedId } = session;
  const record = session.loadedRecord;
  const [previewOpen, setPreviewOpen] = useState(false);
  const feedback = useSaveFeedback({ session, displayName: postType, siteUrl });
  const contributorSave = useSaveButtonPhase(feedback.save);

  useSaveShortcut(() => void feedback.save());

  const openPreview = useCallback(() => setPreviewOpen(true), []);

  // Core 301-redirects a published or sent post away from /p/:uuid/ and drops the
  // audience query, so Ember offers a preview only while the post is a draft.
  const isDraft = post.status === 'draft';

  usePreviewShortcut(
    useCallback(() => {
      setPreviewOpen(!previewOpen);
      if (previewOpen) {
        onOpenFlow('none');
      }
    }, [onOpenFlow, previewOpen]),
    isDraft && persistedId !== null,
  );

  // Ember saves a dirty draft before previewing it and leaves every other post as it is.
  const saveBeforePreview = useCallback(async () => {
    if (session.publishTime.status !== 'draft' || !session.isDirty()) {
      return;
    }
    await requireSaved(session.saveExplicit());
  }, [session]);

  const isSaving =
    session.state.kind === 'preparing' ||
    session.state.kind === 'saving' ||
    session.state.kind === 'pending-coalesced';
  const isContributor = !!currentUser && isContributorUser(currentUser);

  // A post the server has never seen can be neither published nor previewed.
  if (!persistedId) {
    return null;
  }

  const preview: HeaderPreviewProps = {
    subjectEditor: {
      value: session.settings.email_subject,
      fallback: session.title,
      hasUnsavedChanges: session.isDirty(),
      isSaving,
      onChange: (value) => session.stageSettings({ email_subject: value }),
      onSave: saveBeforePreview,
    },
    isPost: postType === 'post',
    newsletterSlug: post.newsletter ?? undefined,
    open: previewOpen,
    postId: persistedId,
    previewUrl: postPreviewUrl(siteUrl, record?.uuid),
    onBeforeOpen: saveBeforePreview,
    onOpenChange: setPreviewOpen,
  };

  return (
    <Inline data-testid={editorHeaderActions} gap="md">
      {isDraft ? (
        <PageHeader.Action
          className="bg-background/80 backdrop-blur-sm"
          fallbackSize="sm"
          label="Preview"
          onClick={openPreview}
        >
          Preview
        </PageHeader.Action>
      ) : null}
      {isContributor ? (
        <>
          <Button
            disabled={isSaving}
            size={isAdmin7 ? 'default' : 'sm'}
            onClick={() => void contributorSave.run()}
          >
            {SAVE_LABELS[contributorSave.phase]}
          </Button>
          {isDraft ? <PostPreviewModal {...preview} /> : null}
        </>
      ) : (
        <PublishActions
          feedback={feedback}
          isDraft={isDraft}
          isSaving={isSaving}
          offersEmailRetry={offersEmailRetry}
          openFlow={openFlow}
          post={post}
          preview={preview}
          session={session}
          tkCount={tkCount}
          onOpenFlow={onOpenFlow}
          onPreview={openPreview}
        />
      )}
    </Inline>
  );
}

interface PublishActionsProps {
  session: EditorSessionHandle;
  feedback: ReturnType<typeof useSaveFeedback>;
  post: PublishFlowPost;
  tkCount: number;
  isDraft: boolean;
  isSaving: boolean;
  offersEmailRetry: boolean;
  openFlow: OpenFlow;
  preview: HeaderPreviewProps;
  onOpenFlow: (flow: OpenFlow) => void;
  onPreview: () => void;
}

/**
 * The publish controls, mounted only for roles that can publish: the publish
 * inputs read a member count contributors are not allowed to see.
 */
function PublishActions({
  session,
  feedback,
  post,
  tkCount,
  isDraft,
  isSaving,
  offersEmailRetry,
  openFlow,
  preview,
  onOpenFlow,
  onPreview,
}: PublishActionsProps) {
  const navigate = useNavigate();
  const isEmberOwned = useEmberOwnedRouteMatcher();
  const { isAdmin7 } = useShade();
  const inputs = usePublishInputs();
  const limits = usePublishLimits();
  const { data: settingsData } = useEditorSettings();
  const siteTitle = getSettingValue<string>(settingsData?.settings ?? null, 'title') ?? undefined;
  const paywallImprovements = useFeatureFlag('paywallImprovements', {
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  // A refetch of any input must not unmount an open flow, so readiness latches once.
  const [everReady, setEverReady] = useState(false);
  const [openedFromPreview, setOpenedFromPreview] = useState(false);

  if (inputs.isReady && !everReady) {
    setEverReady(true);
  }

  // The publish command carries the live post, so only unsaved work needs a save first.
  const saveBeforePublish = useCallback(async () => {
    if (!session.isDirty()) {
      return;
    }
    await requireSaved(session.saveExplicit());
  }, [session]);
  const { save, showReverted } = feedback;
  const update = useSaveButtonPhase(save);
  const revertToDraft = useCallback(() => {
    onOpenFlow('none');
    void session.dispatchPublish({ kind: 'revert' });
  }, [onOpenFlow, session]);
  const closeFlow = useCallback(() => {
    setOpenedFromPreview(false);
    onOpenFlow('none');
  }, [onOpenFlow]);
  const openPublishFlow = useCallback(() => {
    setOpenedFromPreview(false);
    onOpenFlow('publish');
  }, [onOpenFlow]);
  const { onOpenChange: setPreviewOpen } = preview;
  const changePreviewOpen = useCallback(
    (open: boolean) => {
      setPreviewOpen(open);
      if (!open) {
        closeFlow();
      }
    },
    [closeFlow, setPreviewOpen],
  );
  const publishFromPreview = useCallback(() => {
    setOpenedFromPreview(true);
    setPreviewOpen(false);
    onOpenFlow('publish');
  }, [onOpenFlow, setPreviewOpen]);

  // The chord stays off while the preview is open: the preview's own Publish
  // button is the only way into the flow from there.
  usePublishShortcut(openPublishFlow, isDraft && inputs.isReady && !preview.open);

  // A draft's Publish and the status line's retry stay disabled until these inputs load.
  const inputsError =
    (isDraft || offersEmailRetry) && inputs.error ? (
      <>
        <Text
          className="bg-background/80 text-destructive backdrop-blur-sm"
          data-testid={editorPublishInputsError}
          role="alert"
          size="sm"
        >
          {inputs.error.message}
        </Text>
        <Button
          className="bg-background/80 backdrop-blur-sm"
          size={isAdmin7 ? 'default' : 'sm'}
          variant="ghost"
          onClick={inputs.retry}
        >
          Retry
        </Button>
      </>
    ) : null;

  return (
    <>
      {isDraft ? (
        <>
          {inputsError}
          <PageHeader.Action
            className="bg-background/80 font-semibold text-state-success backdrop-blur-sm hover:text-state-success disabled:text-text-secondary/60 disabled:opacity-100"
            disabled={!inputs.isReady}
            fallbackSize="sm"
            label="Publish"
            onClick={openPublishFlow}
          >
            Publish
          </PageHeader.Action>
          <PostPreviewModal
            {...preview}
            animate={openFlow !== 'publish'}
            publishDisabled={!inputs.isReady}
            onOpenChange={changePreviewOpen}
            onPublish={publishFromPreview}
          />
        </>
      ) : (
        <>
          {inputsError}
          {/* Ember routes a sent post to the update flow from its status line, not the header. */}
          {post.status === 'sent' ? null : (
            <PageHeader.Action
              className="bg-background/80 backdrop-blur-sm"
              fallbackSize="sm"
              fallbackVariant="ghost"
              label={post.status === 'scheduled' ? 'Unschedule' : 'Unpublish'}
              onClick={() => onOpenFlow('update')}
            >
              {post.status === 'scheduled' ? 'Unschedule' : 'Unpublish'}
            </PageHeader.Action>
          )}
          <PageHeader.Action
            className="bg-background/80 font-semibold text-state-success backdrop-blur-sm hover:text-state-success disabled:text-text-secondary/60 disabled:opacity-100"
            disabled={!session.isDirty() || isSaving}
            fallbackSize="sm"
            label={UPDATE_LABELS[update.phase]}
            onClick={() => void update.run()}
          >
            {UPDATE_LABELS[update.phase]}
          </PageHeader.Action>
        </>
      )}

      {openFlow === 'publish' && everReady ? (
        <PublishFlowModal
          animate={!openedFromPreview}
          dispatch={session.dispatchPublish}
          limits={limits}
          paywallImprovements={paywallImprovements}
          post={post}
          showCompletion={false}
          site={inputs.site}
          siteTitle={siteTitle}
          timezone={inputs.timezone}
          tkCount={tkCount}
          user={inputs.user}
          onBeforePublish={saveBeforePublish}
          onClose={closeFlow}
          onCompleted={({ postId, isScheduled, hasEmail }) => {
            const destination =
              post.displayName === 'page'
                ? '/pages'
                : !isScheduled && (hasEmail || post.email || post.emailOnly)
                  ? `/posts/analytics/${postId}`
                  : '/posts';
            navigate(destination, { crossApp: isEmberOwned(destination) });
          }}
          onPreview={onPreview}
          onRevertToDraft={revertToDraft}
        />
      ) : null}

      {openFlow === 'update' && everReady ? (
        <UpdateFlowModal
          dispatch={session.dispatchPublish}
          post={post}
          site={inputs.site}
          timezone={inputs.timezone}
          user={inputs.user}
          onClose={closeFlow}
          onReverted={showReverted}
        />
      ) : null}
    </>
  );
}
