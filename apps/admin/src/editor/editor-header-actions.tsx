import { useCallback, useState } from 'react';
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
import { buildPublishFlowPost, type PublishFlowPost } from './publish/flow-post';
import { describeCompletionFailure } from './publish/completion-message';
import { usePublishInputs } from './publish/use-publish-inputs';
import { useEditorSettings } from './use-editor-settings';
import type { EditorSessionHandle } from './session/use-editor-session';
import type { SaveCompletion } from './engine/save-engine';
import { usePreviewShortcut, usePublishShortcut } from './use-editor-shortcuts';

type OpenFlow = 'none' | 'publish' | 'update';

/** The preview's props short of Publish, which only the publish controls can supply. */
type HeaderPreviewProps = Omit<PostPreviewModalProps, 'onPublish' | 'publishDisabled'>;

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
  postType: PostType;
  currentUser?: User;
  siteUrl: string;
  /** Unresolved TK markers in the title, excerpt, body and feature image. */
  tkCount: number;
}

/**
 * The editor header's publish and preview controls. Every write goes through
 * the session's engine; nothing here saves the post itself.
 */
export function EditorHeaderActions({
  session,
  postType,
  currentUser,
  siteUrl,
  tkCount,
}: EditorHeaderActionsProps) {
  const { isAdmin7 } = useShade();
  const { persistedId, publishTime, title } = session;
  const record = session.loadedRecord;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [openFlow, setOpenFlow] = useState<OpenFlow>('none');

  const openPreview = useCallback(() => setPreviewOpen(true), []);

  const post = buildPublishFlowPost({
    snapshot: {
      id: persistedId,
      status: publishTime.status,
      publishedAt: publishTime.publishedAt,
      title,
    },
    record,
    displayName: postType,
    lexical: session.getLiveLexical(),
  });
  // Core 301-redirects a published or sent post away from /p/:uuid/ and drops the
  // audience query, so Ember offers a preview only while the post is a draft.
  const isDraft = post.status === 'draft';

  usePreviewShortcut(
    useCallback(() => setPreviewOpen((open) => !open), []),
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
            onClick={session.dispatchExplicit}
          >
            Save
          </Button>
          {isDraft ? <PostPreviewModal {...preview} /> : null}
        </>
      ) : (
        <PublishActions
          isDraft={isDraft}
          isSaving={isSaving}
          openFlow={openFlow}
          post={post}
          preview={preview}
          session={session}
          tkCount={tkCount}
          onOpenFlow={setOpenFlow}
          onPreview={openPreview}
        />
      )}
    </Inline>
  );
}

interface PublishActionsProps {
  session: EditorSessionHandle;
  post: PublishFlowPost;
  tkCount: number;
  isDraft: boolean;
  isSaving: boolean;
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
  post,
  tkCount,
  isDraft,
  isSaving,
  openFlow,
  preview,
  onOpenFlow,
  onPreview,
}: PublishActionsProps) {
  const { isAdmin7 } = useShade();
  const inputs = usePublishInputs();
  const { data: settingsData } = useEditorSettings();
  const siteTitle = getSettingValue<string>(settingsData?.settings ?? null, 'title') ?? undefined;
  const paywallImprovements = useFeatureFlag('paywallImprovements', {
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  // A refetch of any input must not unmount an open flow, so readiness latches once.
  const [everReady, setEverReady] = useState(false);

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
  const revertToDraft = useCallback(() => {
    onOpenFlow('none');
    void session.dispatchPublish({ kind: 'revert' });
  }, [onOpenFlow, session]);
  const closeFlow = useCallback(() => onOpenFlow('none'), [onOpenFlow]);
  const openPublishFlow = useCallback(() => onOpenFlow('publish'), [onOpenFlow]);
  const { onOpenChange: setPreviewOpen } = preview;
  const publishFromPreview = useCallback(() => {
    setPreviewOpen(false);
    onOpenFlow('publish');
  }, [onOpenFlow, setPreviewOpen]);

  // The chord stays off while the preview is open: the preview's own Publish
  // button is the only way into the flow from there.
  usePublishShortcut(openPublishFlow, isDraft && inputs.isReady && !preview.open);

  return (
    <>
      {isDraft ? (
        <>
          <Button
            disabled={!inputs.isReady}
            size={isAdmin7 ? 'default' : 'sm'}
            onClick={openPublishFlow}
          >
            Publish
          </Button>
          {inputs.error ? (
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
          ) : null}
          <PostPreviewModal
            {...preview}
            publishDisabled={!inputs.isReady}
            onPublish={publishFromPreview}
          />
        </>
      ) : (
        <>
          <Button
            disabled={!session.isDirty() || isSaving}
            size={isAdmin7 ? 'default' : 'sm'}
            onClick={session.dispatchExplicit}
          >
            Update
          </Button>
          {/* Ember routes a sent post to the update flow from its status line, not the header. */}
          {post.status === 'sent' ? null : (
            <Button
              className="bg-background/80 backdrop-blur-sm"
              size={isAdmin7 ? 'default' : 'sm'}
              variant="outline"
              onClick={() => onOpenFlow('update')}
            >
              {post.status === 'scheduled' ? 'Unschedule' : 'Unpublish'}
            </Button>
          )}
        </>
      )}

      {openFlow === 'publish' && everReady ? (
        <PublishFlowModal
          dispatch={session.dispatchPublish}
          paywallImprovements={paywallImprovements}
          post={post}
          site={inputs.site}
          siteTitle={siteTitle}
          timezone={inputs.timezone}
          tkCount={tkCount}
          user={inputs.user}
          onBeforePublish={saveBeforePublish}
          onClose={closeFlow}
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
        />
      ) : null}
    </>
  );
}
