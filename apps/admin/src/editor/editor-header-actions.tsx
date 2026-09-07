import { useCallback, useRef, useState } from 'react';
import { Button } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { isContributorUser, type User } from '@tryghost/admin-x-framework/api/users';
import { editorHeaderActions } from '@tryghost/test-data/selectors/editor';
import type { PostType } from './card-config';
import { EDITOR_REQUEST_OPTIONS } from './request-options';
import { PostPreviewModal } from './preview/post-preview-modal';
import { postPreviewUrl } from './preview/preview-url';
import { PublishFlowModal } from './publish/publish-flow-modal';
import { UpdateFlowModal } from './publish/update-flow-modal';
import { buildPublishFlowPost, type PublishFlowPost } from './publish/flow-post';
import { describeCompletionFailure } from './publish/completion-message';
import { usePublishInputs } from './publish/use-publish-inputs';
import type { EditorSessionHandle } from './session/use-editor-session';
import type { SaveCompletion } from './engine/save-engine';
import { usePreviewShortcut } from './use-preview-shortcut';

type OpenFlow = 'none' | 'publish' | 'update';

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
  const snapshot = session.getSaveSnapshot();
  const record = session.loadedRecord;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [openFlow, setOpenFlow] = useState<OpenFlow>('none');
  const previewOpenRef = useRef(previewOpen);
  previewOpenRef.current = previewOpen;

  const openPreview = useCallback(() => {
    setOpenFlow('none');
    setPreviewOpen(true);
  }, []);

  usePreviewShortcut(
    useCallback(() => {
      if (previewOpenRef.current) {
        setPreviewOpen(false);
        return;
      }
      openPreview();
    }, [openPreview]),
    snapshot.id !== null,
  );

  // Ember saves a dirty draft before previewing it and leaves every other post as it is.
  const saveBeforePreview = useCallback(async () => {
    if (session.getSaveSnapshot().status !== 'draft' || !session.isDirty()) {
      return;
    }
    await requireSaved(session.saveExplicit());
  }, [session]);

  const post = buildPublishFlowPost({
    snapshot,
    record,
    displayName: postType,
    lexical: session.getLiveLexical(),
  });
  const isSaving = session.state.kind === 'saving' || session.state.kind === 'pending-coalesced';
  const isContributor = !!currentUser && isContributorUser(currentUser);

  // A post the server has never seen can be neither published nor previewed.
  if (!snapshot.id) {
    return null;
  }

  return (
    <Inline className="ml-auto" data-testid={editorHeaderActions} gap="sm">
      <Button size="sm" variant="outline" onClick={openPreview}>
        Preview
      </Button>
      {isContributor ? (
        <Button disabled={isSaving} size="sm" onClick={session.dispatchExplicit}>
          Save
        </Button>
      ) : (
        <PublishActions
          isSaving={isSaving}
          openFlow={openFlow}
          post={post}
          session={session}
          tkCount={tkCount}
          onOpenFlow={setOpenFlow}
          onPreview={openPreview}
        />
      )}
      <PostPreviewModal
        isPost={postType === 'post'}
        newsletterSlug={post.newsletter ?? undefined}
        open={previewOpen}
        postId={snapshot.id}
        previewUrl={postPreviewUrl(siteUrl, record?.uuid)}
        onBeforeOpen={saveBeforePreview}
        onOpenChange={setPreviewOpen}
      />
    </Inline>
  );
}

interface PublishActionsProps {
  session: EditorSessionHandle;
  post: PublishFlowPost;
  tkCount: number;
  isSaving: boolean;
  openFlow: OpenFlow;
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
  isSaving,
  openFlow,
  onOpenFlow,
  onPreview,
}: PublishActionsProps) {
  const inputs = usePublishInputs();
  const { data: settingsData } = useBrowseSettings({
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const siteTitle = getSettingValue<string>(settingsData?.settings ?? null, 'title') ?? undefined;
  const paywallImprovements = useFeatureFlag('paywallImprovements', {
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });

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

  const isDraft = post.status === 'draft';

  return (
    <>
      {isDraft ? (
        <>
          <Button disabled={!inputs.isReady} size="sm" onClick={() => onOpenFlow('publish')}>
            Publish
          </Button>
          {inputs.error ? (
            <Button size="sm" variant="ghost" onClick={inputs.retry}>
              Retry
            </Button>
          ) : null}
        </>
      ) : (
        <>
          <Button
            disabled={!session.isDirty() || isSaving}
            size="sm"
            onClick={session.dispatchExplicit}
          >
            Update
          </Button>
          {/* An email-only send cannot be reverted, so it is offered no update flow. */}
          {post.status === 'sent' ? null : (
            <Button size="sm" variant="outline" onClick={() => onOpenFlow('update')}>
              {post.status === 'scheduled' ? 'Unschedule' : 'Unpublish'}
            </Button>
          )}
        </>
      )}

      {openFlow === 'publish' && inputs.isReady ? (
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

      {openFlow === 'update' && inputs.isReady ? (
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
