import { useCallback, useState } from 'react';
import { Button } from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { isContributorUser, type User } from '@tryghost/admin-x-framework/api/users';
import {
  editorHeaderActions,
  editorPublishInputsError,
} from '@tryghost/test-data/selectors/editor';
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
import { usePublishShortcut } from './use-publish-shortcut';

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

  const openPreview = useCallback(() => setPreviewOpen(true), []);
  const closePreview = useCallback(() => setPreviewOpen(false), []);

  const post = buildPublishFlowPost({
    snapshot,
    record,
    displayName: postType,
    lexical: session.getLiveLexical(),
  });
  // Core 301-redirects a published or sent post away from /p/:uuid/ and drops the
  // audience query, so Ember offers a preview only while the post is a draft.
  const isDraft = post.status === 'draft';

  usePreviewShortcut(
    useCallback(() => setPreviewOpen((open) => !open), []),
    isDraft && snapshot.id !== null,
  );

  // Ember saves a dirty draft before previewing it and leaves every other post as it is.
  const saveBeforePreview = useCallback(async () => {
    if (session.getSaveSnapshot().status !== 'draft' || !session.isDirty()) {
      return;
    }
    await requireSaved(session.saveExplicit());
  }, [session]);

  const isSaving = session.state.kind === 'saving' || session.state.kind === 'pending-coalesced';
  const isContributor = !!currentUser && isContributorUser(currentUser);

  // A post the server has never seen can be neither published nor previewed.
  if (!snapshot.id) {
    return null;
  }

  return (
    <Inline data-testid={editorHeaderActions} gap="sm">
      {isDraft ? (
        <Button size="sm" variant="outline" onClick={openPreview}>
          Preview
        </Button>
      ) : null}
      {isContributor ? (
        <Button disabled={isSaving} size="sm" onClick={session.dispatchExplicit}>
          Save
        </Button>
      ) : (
        <PublishActions
          isDraft={isDraft}
          isSaving={isSaving}
          openFlow={openFlow}
          post={post}
          previewOpen={previewOpen}
          session={session}
          tkCount={tkCount}
          onOpenFlow={setOpenFlow}
          onPreview={openPreview}
        />
      )}
      {isDraft ? (
        <PostPreviewModal
          isPost={postType === 'post'}
          newsletterSlug={post.newsletter ?? undefined}
          open={previewOpen}
          postId={snapshot.id}
          previewUrl={postPreviewUrl(siteUrl, record?.uuid)}
          onBeforeOpen={saveBeforePreview}
          onOpenChange={setPreviewOpen}
          onReturnToPublish={openFlow === 'publish' ? closePreview : undefined}
        />
      ) : null}
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
  previewOpen: boolean;
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
  previewOpen,
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

  // A flow opened under the preview's portal is hidden from a screen reader,
  // so the preview's own Publish button is the only way into it from there.
  usePublishShortcut(openPublishFlow, isDraft && inputs.isReady && !previewOpen);

  return (
    <>
      {isDraft ? (
        <>
          <Button disabled={!inputs.isReady} size="sm" onClick={openPublishFlow}>
            Publish
          </Button>
          {inputs.error ? (
            <>
              <Text
                className="text-destructive"
                data-testid={editorPublishInputsError}
                role="alert"
                size="sm"
              >
                {inputs.error.message}
              </Text>
              <Button size="sm" variant="ghost" onClick={inputs.retry}>
                Retry
              </Button>
            </>
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
          {/* Ember routes a sent post to the update flow from its status line, not the header. */}
          {post.status === 'sent' ? null : (
            <Button size="sm" variant="outline" onClick={() => onOpenFlow('update')}>
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
