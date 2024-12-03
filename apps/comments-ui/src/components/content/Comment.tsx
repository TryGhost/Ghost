import EditForm from './forms/EditForm';
import LikeButton from './buttons/LikeButton';
import MoreButton from './buttons/MoreButton';
import Replies, {RepliesProps} from './Replies';
import ReplyButton from './buttons/ReplyButton';
import ReplyForm from './forms/ReplyForm';
import {Avatar, BlankAvatar} from './Avatar';
import {Comment, OpenCommentForm, useAppContext, useLabs} from '../../AppContext';
import {Transition} from '@headlessui/react';
import {findCommentById, formatExplicitTime, getCommentInReplyToSnippet, getMemberNameFromComment} from '../../utils/helpers';
import {useCallback} from 'react';
import {useRelativeTime} from '../../utils/hooks';

type AnimatedCommentProps = {
    comment: Comment;
    parent?: Comment;
};

const AnimatedComment: React.FC<AnimatedCommentProps> = ({comment, parent}) => {
    return (
        <Transition
            data-testid="animated-comment"
            enter="transition-opacity duration-300 ease-out"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            id={comment.id}
            leave="transition-opacity duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            show={true}
            appear
        >
            <CommentComponent comment={comment} parent={parent} />
        </Transition>
    );
};

export const CommentComponent: React.FC<CommentProps> = ({comment, parent}) => {
    const {dispatchAction, admin} = useAppContext();
    const labs = useLabs();
    const {showDeletedMessage, showHiddenMessage, showCommentContent} = useCommentVisibility(comment, admin, labs);

    const openEditMode = useCallback(() => {
        const newForm: OpenCommentForm = {
            id: comment.id,
            type: 'edit',
            hasUnsavedChanges: false,
            in_reply_to_id: comment.in_reply_to_id,
            in_reply_to_snippet: comment.in_reply_to_snippet
        };
        dispatchAction('openCommentForm', newForm);
    }, [comment.id, dispatchAction]);

    if (showDeletedMessage) {
        return <UnpublishedComment comment={comment} openEditMode={openEditMode} />;
    } else if (showCommentContent && !showHiddenMessage) {
        return <PublishedComment comment={comment} openEditMode={openEditMode} parent={parent} />;
    } else if (!labs.commentImprovements && comment.status !== 'published' || showHiddenMessage) {
        return <UnpublishedComment comment={comment} openEditMode={openEditMode} />;
    }

    return null;
};

type CommentProps = AnimatedCommentProps;
const useCommentVisibility = (comment: Comment, admin: boolean, labs: {commentImprovements?: boolean}) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isDeleted = comment.status === 'deleted';
    const isHidden = comment.status === 'hidden';

    if (labs?.commentImprovements) {
        return {
            // Show deleted message only when comment has replies (regardless of admin status)
            showDeletedMessage: isDeleted && hasReplies,
            // Show hidden message for non-admins when comment has replies
            showHiddenMessage: hasReplies && isHidden && !admin,
            // Show comment content if not deleted AND (is published OR admin viewing hidden)
            showCommentContent: !isDeleted && (admin || comment.status === 'published')
        };
    }

    // Original behavior when labs is false
    return {
        showDeletedMessage: false,
        showHiddenMessage: false,
        showCommentContent: comment.status === 'published'
    };
};

type PublishedCommentProps = CommentProps & {
    openEditMode: () => void;
}
const PublishedComment: React.FC<PublishedCommentProps> = ({comment, parent, openEditMode}) => {
    const {dispatchAction, openCommentForms, admin} = useAppContext();
    const labs = useLabs();

    // Determine if the comment should be displayed with reduced opacity
    const isHidden = labs.commentImprovements && admin && comment.status === 'hidden';
    const hiddenClass = isHidden ? 'opacity-30' : '';

    // Check if this comment is being edited
    const editForm = openCommentForms.find(openForm => openForm.id === comment.id && openForm.type === 'edit');
    const isInEditMode = !!editForm;

    // currently a reply-to-reply form is displayed inside the top-level PublishedComment component
    // so we need to check for a match of either the comment id or the parent id
    const openForm = openCommentForms.find(f => (f.id === comment.id || f.parent_id === comment.id) && f.type === 'reply');
    // avoid displaying the reply form inside RepliesContainer
    const displayReplyForm = openForm && (!openForm.parent_id || openForm.parent_id === comment.id);
    // only highlight the reply button for the comment that is being replied to
    const highlightReplyButton = !!(openForm && openForm.id === comment.id);

    const openReplyForm = useCallback(async () => {
        if (openForm && openForm.id === comment.id) {
            dispatchAction('closeCommentForm', openForm.id);
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
                ...inReplyToDetails
            };

            await dispatchAction('openCommentForm', newForm);
        }
    }, [comment, parent, openForm, dispatchAction]);

    const hasReplies = displayReplyForm || (comment.replies && comment.replies.length > 0);
    const avatar = (<Avatar comment={comment} />);

    return (
        <CommentLayout avatar={avatar} className={hiddenClass} hasReplies={hasReplies}>
            <div>
                {isInEditMode ? (
                    <>
                        <CommentHeader className={hiddenClass} comment={comment} />
                        <EditForm comment={comment} openForm={editForm} parent={parent} />
                    </>
                ) : (
                    <>
                        <CommentHeader className={hiddenClass} comment={comment} />
                        <CommentBody className={hiddenClass} html={comment.html} />
                        <CommentMenu
                            comment={comment}
                            highlightReplyButton={highlightReplyButton}
                            openEditMode={openEditMode}
                            openReplyForm={openReplyForm}
                            parent={parent}
                        />
                    </>
                )}
            </div>
            <RepliesContainer comment={comment} />
            {displayReplyForm && <ReplyFormBox comment={comment} openForm={openForm} />}
        </CommentLayout>
    );
};

type UnpublishedCommentProps = {
    comment: Comment;
    openEditMode: () => void;
}
const UnpublishedComment: React.FC<UnpublishedCommentProps> = ({comment, openEditMode}) => {
    const {openCommentForms, t, labs, admin} = useAppContext();

    const avatar = (labs.commentImprovements && admin && comment.status !== 'deleted') ?
        <Avatar comment={comment} /> :
        <BlankAvatar />;
    const hasReplies = comment.replies && comment.replies.length > 0;

    const notPublishedMessage = comment.status === 'hidden' ?
        t('This comment has been hidden.') :
        comment.status === 'deleted' ?
            t('This comment has been removed.') :
            '';

    // currently a reply-to-reply form is displayed inside the top-level PublishedComment component
    // so we need to check for a match of either the comment id or the parent id
    const openForm = openCommentForms.find(f => (f.id === comment.id || f.parent_id === comment.id) && f.type === 'reply');
    // avoid displaying the reply form inside RepliesContainer
    const displayReplyForm = openForm && (!openForm.parent_id || openForm.parent_id === comment.id);

    // Only show MoreButton for hidden (not deleted) comments when admin
    const showMoreButton = admin && comment.status === 'hidden';

    return (
        <CommentLayout avatar={avatar} hasReplies={hasReplies}>
            <div className="mt-[-3px] flex items-start">
                <div className="flex h-10 flex-row items-center gap-4 pb-[8px] pr-4">
                    <p className="text-md mt-[4px] font-sans leading-normal text-neutral-900/40 sm:text-lg dark:text-white/60">
                        {notPublishedMessage}
                    </p>
                    {showMoreButton && (
                        <div className="mt-[4px]">
                            <MoreButton comment={comment} toggleEdit={openEditMode} />
                        </div>
                    )}
                </div>
            </div>
            <RepliesContainer comment={comment} />
            {displayReplyForm && <ReplyFormBox comment={comment} openForm={openForm} />}
        </CommentLayout>
    );
};

// Helper components

const MemberExpertise: React.FC<{comment: Comment}> = ({comment}) => {
    const {member} = useAppContext();
    const memberExpertise = member && comment.member && comment.member.uuid === member.uuid ? member.expertise : comment?.member?.expertise;

    if (!memberExpertise) {
        return null;
    }

    return (
        <span className="[overflow-wrap:anywhere]"><span className="mx-[0.3em] hidden sm:inline-block">·</span>{memberExpertise}</span>
    );
};

const EditedInfo: React.FC<{comment: Comment}> = ({comment}) => {
    const {t} = useAppContext();
    if (!comment.edited_at) {
        return null;
    }
    return (
        <span>
            &nbsp;({t('edited')})
        </span>
    );
};
const RepliesContainer: React.FC<RepliesProps & {className?: string}> = ({comment, className = ''}) => {
    const hasReplies = comment.replies && comment.replies.length > 0;

    if (!hasReplies) {
        return null;
    }

    return (
        <div className={`-ml-2 mb-4 mt-7 sm:mb-0 sm:mt-8 ${className}`}>
            <Replies comment={comment} />
        </div>
    );
};

type ReplyFormBoxProps = {
    comment: Comment;
    openForm: OpenCommentForm;
};
const ReplyFormBox: React.FC<ReplyFormBoxProps> = ({comment, openForm}) => {
    return (
        <div className="my-8 sm:my-10">
            <ReplyForm openForm={openForm} parent={comment} />
        </div>
    );
};

//
// -- Published comment components --
//

const AuthorName: React.FC<{comment: Comment}> = ({comment}) => {
    const {t} = useAppContext();
    const name = getMemberNameFromComment(comment, t);
    return (
        <h4 className="font-sans text-base font-bold leading-snug text-neutral-900 sm:text-sm dark:text-white/85">
            {name}
        </h4>
    );
};

type CommentHeaderProps = {
    comment: Comment;
    className?: string;
}

const CommentHeader: React.FC<CommentHeaderProps> = ({comment, className = ''}) => {
    const {comments, t} = useAppContext();
    const labs = useLabs();
    const createdAtRelative = useRelativeTime(comment.created_at);
    const {member} = useAppContext();
    const memberExpertise = member && comment.member && comment.member.uuid === member.uuid ? member.expertise : comment?.member?.expertise;
    const isReplyToReply = labs.commentImprovements && comment.in_reply_to_id && comment.in_reply_to_snippet;

    let inReplyToSnippet = comment.in_reply_to_snippet;

    if (isReplyToReply) {
        const inReplyToComment = findCommentById(comments, comment.in_reply_to_id);
        if (inReplyToComment && inReplyToComment.status !== 'published') {
            inReplyToSnippet = `[${t('removed')}]`;
        }
    }

    const scrollRepliedToCommentIntoView = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();

        if (!e.target) {
            return;
        }

        const element = (e.target as HTMLElement).ownerDocument.getElementById(comment.in_reply_to_id);
        if (element) {
            element.scrollIntoView({behavior: 'smooth', block: 'center'});
        }
    };

    return (
        <>
            <div className={`mt-0.5 flex flex-wrap items-start sm:flex-row ${memberExpertise ? 'flex-col' : 'flex-row'} ${isReplyToReply ? 'mb-0.5' : 'mb-2'} ${className}`}>
                <AuthorName comment={comment} />
                <div className="flex items-baseline pr-4 font-sans text-base leading-snug text-neutral-900/50 sm:text-sm dark:text-white/60">
                    <span>
                        <MemberExpertise comment={comment}/>
                        <span title={formatExplicitTime(comment.created_at)}><span className="mx-[0.3em]">·</span>{createdAtRelative}</span>
                        <EditedInfo comment={comment} />
                    </span>
                </div>
            </div>
            {(isReplyToReply &&
                <div className="mb-2 line-clamp-1 font-sans text-base leading-snug text-neutral-900/50 sm:text-sm dark:text-white/60">
                    <span>{t('Replied to')}</span>:&nbsp;<a className="font-semibold text-neutral-900/60 transition-colors hover:text-neutral-900/70 dark:text-white/70 dark:hover:text-white/80" data-testid="comment-in-reply-to" href={`#${comment.in_reply_to_id}`} onClick={scrollRepliedToCommentIntoView}>{inReplyToSnippet}</a>
                </div>
            )}
        </>
    );
};

type CommentBodyProps = {
    html: string;
    className?: string;
}

const CommentBody: React.FC<CommentBodyProps> = ({html, className = ''}) => {
    const dangerouslySetInnerHTML = {__html: html};
    return (
        <div className={`mt mb-2 flex flex-row items-center gap-4 pr-4 ${className}`}>
            <p dangerouslySetInnerHTML={dangerouslySetInnerHTML} className="gh-comment-content text-md text-pretty font-sans leading-normal text-neutral-900 [overflow-wrap:anywhere] sm:text-lg dark:text-white/85" data-testid="comment-content"/>
        </div>
    );
};

type CommentMenuProps = {
    comment: Comment;
    openReplyForm: () => void;
    highlightReplyButton: boolean;
    openEditMode: () => void;
    parent?: Comment;
    className?: string;
};
const CommentMenu: React.FC<CommentMenuProps> = ({comment, openReplyForm, highlightReplyButton, openEditMode, parent, className = ''}) => {
    const {member, commentsEnabled, t, admin} = useAppContext();
    const labs = useLabs();

    const paidOnly = commentsEnabled === 'paid';
    const isPaidMember = member && !!member.paid;
    const canReply = member && (isPaidMember || !paidOnly) && (labs.commentImprovements ? true : !parent);
    const isHiddenForAdmin = labs.commentImprovements && admin && comment.status === 'hidden';

    if (isHiddenForAdmin) {
        return (
            <div className={`flex items-center gap-4 ${className}`}>
                <span className="font-sans text-base leading-snug text-red-600 sm:text-sm">{t('Hidden for members')}</span>
                {<MoreButton comment={comment} toggleEdit={openEditMode} />}
            </div>
        );
    }

    return (
        labs.commentImprovements ? (
            <div className={`flex items-center gap-4 ${className}`}>
                {<LikeButton comment={comment} />}
                {<ReplyButton isReplying={highlightReplyButton} openReplyForm={openReplyForm} />}
                {<MoreButton comment={comment} toggleEdit={openEditMode} />}
            </div>
        ) : (
            <div className={`flex items-center gap-4 ${className}`}>
                {<LikeButton comment={comment} />}
                {(canReply && <ReplyButton isReplying={highlightReplyButton} openReplyForm={openReplyForm} />)}
                {<MoreButton comment={comment} toggleEdit={openEditMode} />}
            </div>
        )
    );
};

//
// -- Layout --
//

const RepliesLine: React.FC<{hasReplies: boolean}> = ({hasReplies}) => {
    if (!hasReplies) {
        return null;
    }

    return (<div className="mb-2 h-full w-px grow rounded bg-gradient-to-b from-neutral-900/10 via-neutral-900/10 to-transparent dark:from-white/10 dark:via-white/10" />);
};

type CommentLayoutProps = {
    children: React.ReactNode;
    avatar: React.ReactNode;
    hasReplies: boolean;
    className?: string;
}
const CommentLayout: React.FC<CommentLayoutProps> = ({children, avatar, hasReplies, className = ''}) => {
    return (
        <div className={`flex w-full flex-row ${hasReplies === true ? 'mb-0' : 'mb-7'}`} data-testid="comment-component">
            <div className="mr-2 flex flex-col items-center justify-start sm:mr-3">
                <div className={`flex-0 mb-3 sm:mb-4 ${className}`}>
                    {avatar}
                </div>
                <RepliesLine hasReplies={hasReplies} />
            </div>
            <div className="grow">
                {children}
            </div>
        </div>
    );
};

//
// -- Default --
//

export default AnimatedComment;
