import EditForm from './forms/edit-form';
import LikeButton, { DislikeButton } from './buttons/like-button';
import LikeCount from './buttons/like-count';
import MoreButton from './buttons/more-button';
import PinnedLabel from './pinned-label';
import React, { useCallback } from 'react';
import Replies, { RepliesProps } from './replies';
import ReplyButton from './buttons/reply-button';
import ReplyForm from './forms/reply-form';
import ThreadedReplies from './threaded-replies';
import { Avatar, BlankAvatar } from './avatar';
import { Comment, OpenCommentForm, useAppContext } from '../../app-context';
import { Transition } from '@headlessui/react';
import {
  buildCommentPermalink,
  formatExplicitTime,
  getCommentInReplyToSnippet,
  getMemberNameFromComment,
} from '../../utils/helpers';
import { useRelativeTime } from '../../utils/hooks';

type CommentLayoutVariant = 'root' | 'reply';

type AnimatedCommentProps = {
  comment: Comment;
  parent?: Comment;
  layoutVariant?: CommentLayoutVariant;
  isLastSibling?: boolean;
};

const AnimatedComment: React.FC<React.PropsWithChildren<AnimatedCommentProps>> = ({
  children,
  comment,
  parent,
  layoutVariant,
  isLastSibling,
}) => {
  const { commentsIsLoading } = useAppContext();

  return (
    <Transition
      className={`${commentsIsLoading ? 'animate-pulse' : ''}`}
      data-testid="animated-comment"
      enter="transition-opacity duration-300 ease-out"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition-opacity duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
      show={true}
      appear
    >
      <CommentComponent
        comment={comment}
        isLastSibling={isLastSibling}
        layoutVariant={layoutVariant}
        parent={parent}
      >
        {children}
      </CommentComponent>
    </Transition>
  );
};

export const CommentComponent: React.FC<CommentProps> = ({
  children,
  comment,
  parent,
  layoutVariant = 'root',
  isLastSibling = false,
}) => {
  const { dispatchAction, isAdmin } = useAppContext();
  const hasNestedReplies = React.Children.count(children) > 0;
  const { showDeletedMessage, showHiddenMessage, showCommentContent } = useCommentVisibility(
    comment,
    isAdmin,
    hasNestedReplies,
  );

  const openEditMode = useCallback(() => {
    const newForm: OpenCommentForm = {
      id: comment.id,
      type: 'edit',
      hasUnsavedChanges: false,
      in_reply_to_id: comment.in_reply_to_id,
      in_reply_to_snippet: comment.in_reply_to_snippet,
    };
    dispatchAction('openCommentForm', newForm);
  }, [comment.id, dispatchAction]);

  if (showDeletedMessage || showHiddenMessage) {
    return (
      <UnpublishedComment
        comment={comment}
        isLastSibling={isLastSibling}
        layoutVariant={layoutVariant}
        openEditMode={openEditMode}
        parent={parent}
      >
        {children}
      </UnpublishedComment>
    );
  } else if (showCommentContent && !showHiddenMessage) {
    return (
      <PublishedComment
        comment={comment}
        isLastSibling={isLastSibling}
        layoutVariant={layoutVariant}
        openEditMode={openEditMode}
        parent={parent}
      >
        {children}
      </PublishedComment>
    );
  }

  return null;
};

type CommentProps = React.PropsWithChildren<AnimatedCommentProps>;

// Threaded replies render their own reply form inline, so only match the current comment
const getActiveReplyForm = (comment: Comment, openCommentForms: OpenCommentForm[]) => {
  return openCommentForms.find((f) => f.id === comment.id && f.type === 'reply');
};

const useCommentVisibility = (comment: Comment, admin: boolean, hasNestedReplies?: boolean) => {
  const hasReplies = hasNestedReplies || (comment.replies && comment.replies.length > 0);
  const isDeleted = comment.status === 'deleted';
  const isHidden = comment.status === 'hidden';

  return {
    // Show deleted message only when comment has replies (regardless of admin status)
    showDeletedMessage: isDeleted && hasReplies,
    // Show hidden message for non-admins when comment has replies
    showHiddenMessage: hasReplies && isHidden && !admin,
    // Show comment content if not deleted AND (is published OR admin viewing hidden)
    showCommentContent: !isDeleted && (admin || comment.status === 'published'),
  };
};

type PublishedCommentProps = CommentProps & {
  openEditMode: () => void;
};
const PublishedComment: React.FC<PublishedCommentProps> = ({
  children,
  comment,
  parent,
  openEditMode,
  layoutVariant = 'root',
  isLastSibling = false,
}) => {
  const { dispatchAction, openCommentForms, isAdmin, commentIdToHighlight, commentIdFromHash } =
    useAppContext();
  const hasNestedReplies = React.Children.count(children) > 0;

  // Determine if the comment should be displayed with reduced opacity
  const isHidden = isAdmin && comment.status === 'hidden';
  const hiddenClass = isHidden ? 'opacity-30' : '';

  // Check if this comment is being edited
  const editForm = openCommentForms.find(
    (openForm) => openForm.id === comment.id && openForm.type === 'edit',
  );
  const isInEditMode = !!editForm;

  const activeReplyForm = getActiveReplyForm(comment, openCommentForms);
  // only highlight the reply button for the comment that is being replied to
  const highlightReplyButton = !!(activeReplyForm && activeReplyForm.id === comment.id);

  const openReplyForm = useCallback(async () => {
    if (activeReplyForm && activeReplyForm.id === comment.id) {
      dispatchAction('closeCommentForm', activeReplyForm.id);
    } else {
      const inReplyToDetails: Partial<OpenCommentForm> = {};

      if (parent) {
        inReplyToDetails.in_reply_to_id = comment.id;
        inReplyToDetails.in_reply_to_snippet = getCommentInReplyToSnippet(comment);
      }

      const newForm: OpenCommentForm = {
        id: comment.id,
        parent_id: parent?.id,
        type: 'reply',
        hasUnsavedChanges: false,
        ...inReplyToDetails,
      };

      await dispatchAction('openCommentForm', newForm);
    }
  }, [comment, parent, activeReplyForm, dispatchAction]);

  const hasChildReplies = hasNestedReplies || (comment.replies && comment.replies.length > 0);
  const hasReplies = !!activeReplyForm || hasChildReplies;
  const avatar = <Avatar member={comment.member} />;
  const replyFormParent = parent || comment;
  const isHighlighted = commentIdFromHash
    ? comment.id === commentIdFromHash && commentIdToHighlight === commentIdFromHash
    : comment.id === commentIdToHighlight;
  return (
    <CommentLayout
      avatar={avatar}
      className={hiddenClass}
      hasReplies={hasReplies}
      isLastSibling={isLastSibling}
      layoutVariant={layoutVariant}
      memberUuid={comment.member?.uuid}
      replies={
        <RepliesContainer comment={comment} parent={parent}>
          {children}
        </RepliesContainer>
      }
      replyForm={
        activeReplyForm ? (
          <ReplyFormBox
            continueLine={hasChildReplies}
            openForm={activeReplyForm}
            parent={replyFormParent}
          />
        ) : null
      }
    >
      <div id={comment.id}>
        {isInEditMode ? (
          <>
            <CommentHeader className={hiddenClass} comment={comment} />
            <EditForm comment={comment} openForm={editForm} parent={parent} />
          </>
        ) : (
          <>
            <CommentHeader className={hiddenClass} comment={comment} />
            <CommentBody
              className={hiddenClass}
              html={comment.html}
              isHighlighted={isHighlighted}
            />
            <CommentMenu
              comment={comment}
              highlightReplyButton={highlightReplyButton}
              openEditMode={openEditMode}
              openReplyForm={openReplyForm}
            />
          </>
        )}
      </div>
    </CommentLayout>
  );
};

type UnpublishedCommentProps = {
  comment: Comment;
  openEditMode: () => void;
  parent?: Comment;
  layoutVariant?: CommentLayoutVariant;
  isLastSibling?: boolean;
};
const UnpublishedComment: React.FC<React.PropsWithChildren<UnpublishedCommentProps>> = ({
  children,
  comment,
  openEditMode,
  parent,
  layoutVariant = 'root',
  isLastSibling = false,
}) => {
  const { isAdmin, openCommentForms, t } = useAppContext();
  const hasNestedReplies = React.Children.count(children) > 0;

  const avatar =
    isAdmin && comment.status !== 'deleted' ? <Avatar member={comment.member} /> : <BlankAvatar />;
  const notPublishedMessage =
    comment.status === 'hidden'
      ? t('This comment has been hidden.')
      : comment.status === 'deleted'
        ? t('This comment has been removed.')
        : '';

  const activeReplyForm = getActiveReplyForm(comment, openCommentForms);
  const hasChildReplies = hasNestedReplies || (comment.replies && comment.replies.length > 0);
  const hasReplies = !!activeReplyForm || hasChildReplies;

  // Only show MoreButton for hidden (not deleted) comments when admin
  const showMoreButton = isAdmin && comment.status === 'hidden';

  const replyFormParent = parent || comment;

  return (
    <CommentLayout
      avatar={avatar}
      hasReplies={hasReplies}
      isLastSibling={isLastSibling}
      layoutVariant={layoutVariant}
      replies={
        <RepliesContainer comment={comment} parent={parent}>
          {children}
        </RepliesContainer>
      }
      replyForm={
        activeReplyForm ? (
          <ReplyFormBox
            continueLine={hasChildReplies}
            openForm={activeReplyForm}
            parent={replyFormParent}
          />
        ) : null
      }
    >
      <div className="mt-[-3px] flex items-start" id={comment.id}>
        <div className="flex h-10 flex-row items-center gap-4 pb-[8px] pr-4">
          <PinnedLabel comment={comment} />
          <p className="mt-[4px] font-sans text-md leading-normal text-neutral-900/40 dark:text-white/60 sm:text-lg">
            {notPublishedMessage}
          </p>
          {showMoreButton && (
            <div className="mt-[4px]">
              <MoreButton comment={comment} toggleEdit={openEditMode} />
            </div>
          )}
        </div>
      </div>
    </CommentLayout>
  );
};

// Helper components

const MemberExpertise: React.FC<{ comment: Comment }> = ({ comment }) => {
  const { member } = useAppContext();
  const memberExpertise =
    member && comment.member && comment.member.uuid === member.uuid
      ? member.expertise
      : comment?.member?.expertise;

  if (!memberExpertise) {
    return null;
  }

  return (
    <span className="[overflow-wrap:anywhere]">
      <span className="mx-[0.3em] hidden sm:inline-block">·</span>
      {memberExpertise}
    </span>
  );
};

const EditedInfo: React.FC<{ comment: Comment }> = ({ comment }) => {
  const { t } = useAppContext();
  if (!comment.edited_at) {
    return null;
  }
  return <span>&nbsp;({t('edited')})</span>;
};

const RepliesContainer: React.FC<
  React.PropsWithChildren<RepliesProps & { className?: string; parent?: Comment }>
> = ({ children, comment, className = '', parent }) => {
  const hasNestedReplies = React.Children.count(children) > 0;
  const hasReplies = hasNestedReplies || (comment.replies && comment.replies.length > 0);

  if (!hasReplies) {
    return null;
  }

  return (
    <div className={`ml-8 flow-root sm:ml-9 ${className}`}>
      {hasNestedReplies ? (
        children
      ) : !parent ? (
        <ThreadedReplies comment={comment} />
      ) : (
        <Replies comment={comment} />
      )}
    </div>
  );
};

type ReplyFormBoxProps = {
  openForm: OpenCommentForm;
  parent: Comment;
  continueLine?: boolean;
};
const ReplyFormBox: React.FC<ReplyFormBoxProps> = ({ openForm, parent, continueLine = false }) => {
  const spacingClass = continueLine ? 'pb-8 sm:pb-10' : 'mb-8 sm:mb-10';

  return (
    <div className={`relative ml-8 sm:ml-9 ${spacingClass}`}>
      {continueLine && (
        <div
          className="pointer-events-none absolute inset-y-0 -left-4 border-l border-neutral-300 dark:border-neutral-700 sm:-left-5"
          data-testid="reply-form-continuation-line"
          aria-hidden
        />
      )}
      <div
        className="pointer-events-none absolute -left-4 top-0 h-4 w-3 border-b border-l border-neutral-300 [border-bottom-left-radius:12px_16px] dark:border-neutral-700 sm:-left-5 sm:w-4 sm:[border-bottom-left-radius:16px_16px]"
        data-testid="reply-form-elbow"
        aria-hidden
      />
      <ReplyForm openForm={openForm} parent={parent} />
    </div>
  );
};

//
// -- Published comment components --
//

const AuthorName: React.FC<{ comment: Comment }> = ({ comment }) => {
  const { t } = useAppContext();
  const name = getMemberNameFromComment(comment, t);
  return (
    <h4 className="font-sans text-base font-bold leading-snug text-neutral-900 dark:text-white/85 sm:text-sm">
      {name}
    </h4>
  );
};

type CommentHeaderProps = {
  comment: Comment;
  className?: string;
};

const CommentHeader: React.FC<CommentHeaderProps> = ({ comment, className = '' }) => {
  const { member } = useAppContext();
  const createdAtRelative = useRelativeTime(comment.created_at);
  const memberExpertise =
    member && comment.member && comment.member.uuid === member.uuid
      ? member.expertise
      : comment?.member?.expertise;

  const timestampElement = (
    <a
      className="hover:underline"
      href={buildCommentPermalink(comment.id)}
      target="_parent"
      title={formatExplicitTime(comment.created_at)}
    >
      <span className="mx-[0.3em]">·</span>
      {createdAtRelative}
    </a>
  );

  return (
    <div
      className={`mb-2 mt-0.5 flex flex-wrap items-start sm:flex-row ${memberExpertise ? 'flex-col' : 'flex-row'} ${className}`}
    >
      <AuthorName comment={comment} />
      <div className="flex items-baseline pr-4 font-sans text-base leading-snug text-neutral-900/50 dark:text-white/60 sm:text-sm">
        <span>
          <MemberExpertise comment={comment} />
          {timestampElement}
          {comment.pinned && (
            <span className="ml-2 inline-flex align-middle">
              <PinnedLabel comment={comment} />
            </span>
          )}
          <EditedInfo comment={comment} />
        </span>
      </div>
    </div>
  );
};

type CommentBodyProps = {
  html: string | null;
  className?: string;
  isHighlighted?: boolean;
};

const CommentBody: React.FC<CommentBodyProps> = ({ html, className = '', isHighlighted }) => {
  if (!html) {
    return null;
  }

  let commentHtml = html;

  if (isHighlighted) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const paragraphs = doc.querySelectorAll('p');

    paragraphs.forEach((p) => {
      const mark = doc.createElement('mark');
      mark.className =
        'animate-[highlight_2.5s_ease-out] [animation-delay:1s] bg-yellow-300/40 -my-0.5 py-0.5 dark:text-white/85 dark:bg-yellow-500/40';

      while (p.firstChild) {
        mark.appendChild(p.firstChild);
      }
      p.appendChild(mark);
    });

    // Serialize the modified html back to a string
    commentHtml = doc.body.innerHTML;
  }

  const dangerouslySetInnerHTML = { __html: commentHtml };

  return (
    <div className={`mt mb-2 flex flex-row items-center gap-4 pr-4 ${className}`}>
      <div
        dangerouslySetInnerHTML={dangerouslySetInnerHTML}
        className="gh-comment-content -mx-1 text-pretty rounded-md px-1 font-sans text-md leading-normal text-neutral-900 [overflow-wrap:anywhere] dark:text-white/85 sm:text-lg"
        data-testid="comment-content"
      />
    </div>
  );
};

type CommentMenuProps = {
  comment: Comment;
  openReplyForm: () => void;
  highlightReplyButton: boolean;
  openEditMode: () => void;
  className?: string;
};
const CommentMenu: React.FC<CommentMenuProps> = ({
  comment,
  openReplyForm,
  highlightReplyButton,
  openEditMode,
  className = '',
}) => {
  const { member, t, isMember, isAdmin, isCommentingDisabled } = useAppContext();
  const [voteDisabled, setVoteDisabled] = React.useState(false);

  const isPublished = comment.status === 'published';
  const isOwnComment = member && comment.member?.uuid === member?.uuid;

  // Visibility decisions
  const showLikeButton = !isCommentingDisabled;
  const showDislikeButton = showLikeButton;
  const showReplyButton = !isCommentingDisabled;
  const shouldShowMoreButton = isAdmin || (isMember && isPublished);
  const shouldHideMoreButton = isCommentingDisabled && isOwnComment;
  const showMoreButton = shouldShowMoreButton && !shouldHideMoreButton;

  if (isAdmin && comment.status === 'hidden') {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <span className="font-sans text-base leading-snug text-red-600 sm:text-sm">
          {t('Hidden for members')}
        </span>
        <MoreButton comment={comment} toggleEdit={openEditMode} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {showLikeButton ? (
        <LikeButton comment={comment} disabled={voteDisabled} setDisabled={setVoteDisabled} />
      ) : (
        <LikeCount count={comment.count.likes} liked={comment.liked} />
      )}
      {showDislikeButton && (
        <DislikeButton comment={comment} disabled={voteDisabled} setDisabled={setVoteDisabled} />
      )}
      {showReplyButton && (
        <ReplyButton
          comment={comment}
          isReplying={highlightReplyButton}
          openReplyForm={openReplyForm}
        />
      )}
      {showMoreButton && <MoreButton comment={comment} toggleEdit={openEditMode} />}
    </div>
  );
};

//
// -- Layout --
//

const RepliesLine: React.FC<{ hasReplies: boolean }> = ({ hasReplies }) => {
  if (!hasReplies) {
    return null;
  }

  return (
    <div
      className="ml-4 h-full grow self-start border-l border-neutral-300 dark:border-neutral-700"
      data-testid="replies-line"
    />
  );
};

type CommentLayoutProps = {
  children: React.ReactNode;
  avatar: React.ReactNode;
  hasReplies: boolean;
  className?: string;
  memberUuid?: string;
  isLastSibling?: boolean;
  layoutVariant?: CommentLayoutVariant;
  replies?: React.ReactNode;
  replyForm?: React.ReactNode;
};

const CommentLayout: React.FC<CommentLayoutProps> = ({
  children,
  avatar,
  hasReplies,
  className = '',
  memberUuid = '',
  isLastSibling = false,
  layoutVariant = 'root',
  replies,
  replyForm,
}) => {
  const isReplyLayout = layoutVariant === 'reply';

  return (
    <div className={`relative flow-root ${hasReplies ? 'pb-4 sm:pb-0' : 'pb-7'}`}>
      {isReplyLayout && !isLastSibling && (
        <div
          className="pointer-events-none absolute inset-y-0 -left-4 border-l border-neutral-300 dark:border-neutral-700 sm:-left-5"
          aria-hidden
        />
      )}
      {isReplyLayout && (
        <div
          className="pointer-events-none absolute -left-4 top-0 h-4 w-3 border-b border-l border-neutral-300 [border-bottom-left-radius:12px_16px] dark:border-neutral-700 sm:-left-5 sm:w-4 sm:[border-bottom-left-radius:16px_16px]"
          aria-hidden
        />
      )}
      <div
        className="flex w-full flex-row"
        data-member-uuid={memberUuid}
        data-testid="comment-component"
      >
        <div className="mr-2 flex flex-col items-center justify-start sm:mr-3">
          <div className={`flex-0 mb-1 ${className}`}>{avatar}</div>
          <RepliesLine hasReplies={hasReplies} />
        </div>
        <div className={`grow ${hasReplies ? 'pb-7 sm:pb-8' : ''}`}>{children}</div>
      </div>
      {replyForm}
      {hasReplies && replies}
    </div>
  );
};

//
// -- Default --
//

export default AnimatedComment;
