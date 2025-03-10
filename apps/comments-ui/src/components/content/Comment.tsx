import EditForm from './forms/EditForm';
import LikeButton from './buttons/LikeButton';
import MoreButton from './buttons/MoreButton';
import Replies, {RepliesProps} from './Replies';
import ReplyButton from './buttons/ReplyButton';
import ReplyForm from './forms/ReplyForm';
import {Avatar, BlankAvatar} from './Avatar';
import {Comment, OpenCommentForm, useAppContext} from '../../AppContext';
import {Transition} from '@headlessui/react';
import {findCommentById, formatExplicitTime, getCommentInReplyToSnippet, getMemberNameFromComment} from '../../utils/helpers';
import {useCallback} from 'react';
import {useRelativeTime} from '../../utils/hooks';

type AnimatedCommentProps = {
    comment: Comment;
    parent?: Comment;
};

const AnimatedComment: React.FC<AnimatedCommentProps> = ({comment, parent}) => {
    const {commentsIsLoading} = useAppContext();
    return (
        <Transition
            className={`${commentsIsLoading ? 'animate-pulse' : ''}`}
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
    const {showDeletedMessage, showHiddenMessage, showCommentContent} = useCommentVisibility(comment, admin);

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

    if (showDeletedMessage || showHiddenMessage) {
        return <UnpublishedComment comment={comment} openEditMode={openEditMode} />;
    } else if (showCommentContent && !showHiddenMessage) {
        return <PublishedComment comment={comment} openEditMode={openEditMode} parent={parent} />;
    }

    return null;
};

type CommentProps = AnimatedCommentProps;
const useCommentVisibility = (comment: Comment, admin: boolean) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isDeleted = comment.status === 'deleted';
    const isHidden = comment.status === 'hidden';

    return {
        // Show deleted message only when comment has replies (regardless of admin status)
        showDeletedMessage: isDeleted && hasReplies,
        // Show hidden message for non-admins when comment has replies
        showHiddenMessage: hasReplies && isHidden && !admin,
        // Show comment content if not deleted AND (is published OR admin viewing hidden)
        showCommentContent: !isDeleted && (admin || comment.status === 'published')
    };
};

type PublishedCommentProps = CommentProps & {
    openEditMode: () => void;
}
const PublishedComment: React.FC<PublishedCommentProps> = ({comment, parent, openEditMode}) => {
    const {dispatchAction, openCommentForms, admin, commentIdToHighlight} = useAppContext();

    // Determine if the comment should be displayed with reduced opacity
    const isHidden = admin && comment.status === 'hidden';
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
        <CommentLayout avatar={avatar} className={hiddenClass} hasReplies={hasReplies} memberUuid={comment.member?.uuid}>
            <div>
                {isInEditMode ? (
                    <>
                        <CommentHeader className={hiddenClass} comment={comment} />
                        <EditForm comment={comment} openForm={editForm} parent={parent} />
                    </>
                ) : (
                    <>
                        <CommentHeader className={hiddenClass} comment={comment} />
                        <CommentBody className={hiddenClass} html={comment.html} isHighlighted={comment.id === commentIdToHighlight} />
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
    const {admin, openCommentForms, t} = useAppContext();

    const avatar = (admin && comment.status !== 'deleted')
        ? <Avatar comment={comment} />
        : <BlankAvatar />;
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

export const RepliedToSnippet: React.FC<{comment: Comment}> = ({comment}) => {
    const {comments, dispatchAction, t} = useAppContext();
    const inReplyToComment = findCommentById(comments, comment.in_reply_to_id);

    const scrollRepliedToCommentIntoView = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();

        if (!e.target) {
            return;
        }

        const element = (e.target as HTMLElement).ownerDocument.getElementById(comment.in_reply_to_id);
        if (element) {
            dispatchAction('highlightComment', {commentId: comment.in_reply_to_id});
            element.scrollIntoView({behavior: 'smooth', block: 'center'});
        }
    };

    let inReplyToSnippet = comment.in_reply_to_snippet;
    // For public API requests hidden/deleted comments won't exist in the comments array
    // unless it was only just deleted in which case it will exist but have a 'deleted' status
    if (!inReplyToComment || inReplyToComment.status !== 'published') {
        inReplyToSnippet = `[${t('removed')}]`;
    }

    const linkToReply = inReplyToComment && inReplyToComment.status === 'published';

    const className = 'font-medium text-neutral-900/60 break-all transition-colors dark:text-white/70';

    return (
        linkToReply
            ? <a className={`${className} hover:text-neutral-900/75 dark:hover:text-white/85`} data-testid="comment-in-reply-to" href={`#${comment.in_reply_to_id}`} onClick={scrollRepliedToCommentIntoView}>{inReplyToSnippet}</a>
            : <span className={className} data-testid="comment-in-reply-to">{inReplyToSnippet}</span>
    );
};

type CommentHeaderProps = {
    comment: Comment;
    className?: string;
}

const CommentHeader: React.FC<CommentHeaderProps> = ({comment, className = ''}) => {
    const {member, t} = useAppContext();
    const createdAtRelative = useRelativeTime(comment.created_at);
    const memberExpertise = member && comment.member && comment.member.uuid === member.uuid ? member.expertise : comment?.member?.expertise;
    const isReplyToReply = comment.in_reply_to_id && comment.in_reply_to_snippet;

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
                    <span>{t('Replied to')}</span>:&nbsp;<RepliedToSnippet comment={comment} />
                </div>
            )}
        </>
    );
};

type CommentBodyProps = {
    html: string;
    className?: string;
    isHighlighted?: boolean;
}

const CommentBody: React.FC<CommentBodyProps> = ({html, className = '', isHighlighted}) => {
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

    const dangerouslySetInnerHTML = {__html: commentHtml};

    return (
        <div className={`mt mb-2 flex flex-row items-center gap-4 pr-4 ${className}`}>
            <p dangerouslySetInnerHTML={dangerouslySetInnerHTML} className="gh-comment-content text-md -mx-1 text-pretty rounded-md px-1 font-sans leading-normal text-neutral-900 [overflow-wrap:anywhere] sm:text-lg dark:text-white/85" data-testid="comment-content"/>
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
const CommentMenu: React.FC<CommentMenuProps> = ({comment, openReplyForm, highlightReplyButton, openEditMode, className = ''}) => {
    const {admin, t} = useAppContext();

    if (admin && comment.status === 'hidden') {
        return (
            <div className={`flex items-center gap-4 ${className}`}>
                <span className="font-sans text-base leading-snug text-red-600 sm:text-sm">{t('Hidden for members')}</span>
                {<MoreButton comment={comment} toggleEdit={openEditMode} />}
            </div>
        );
    } else {
        return (
            <div className={`flex items-center gap-4 ${className}`}>
                {<LikeButton comment={comment} />}
                {<ReplyButton isReplying={highlightReplyButton} openReplyForm={openReplyForm} />}
                {<MoreButton comment={comment} toggleEdit={openEditMode} />}
            </div>
        );
    }
};

//
// -- Layout --
//

const RepliesLine: React.FC<{hasReplies: boolean}> = ({hasReplies}) => {
    if (!hasReplies) {
        return null;
    }

    return (<div className="mb-2 h-full w-px grow rounded bg-gradient-to-b from-neutral-900/15 from-70% to-transparent dark:from-white/20 dark:from-70%" data-testid="replies-line" />);
};

type CommentLayoutProps = {
    children: React.ReactNode;
    avatar: React.ReactNode;
    hasReplies: boolean;
    className?: string;
    memberUuid?: string;
}
const CommentLayout: React.FC<CommentLayoutProps> = ({children, avatar, hasReplies, className = '', memberUuid = ''}) => {
    return (
        <div className={`flex w-full flex-row ${hasReplies === true ? 'mb-0' : 'mb-7'}`} data-member-uuid={memberUuid} data-testid="comment-component">
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
