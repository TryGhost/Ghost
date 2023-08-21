import EditForm from './forms/EditForm';
import LikeButton from './buttons/LikeButton';
import MoreButton from './buttons/MoreButton';
import Replies from './Replies';
import ReplyButton from './buttons/ReplyButton';
import ReplyForm from './forms/ReplyForm';
import {Avatar, BlankAvatar} from './Avatar';
import {Comment, useAppContext} from '../../AppContext';
import {Transition} from '@headlessui/react';
import {formatExplicitTime, isCommentPublished} from '../../utils/helpers';
import {useRelativeTime} from '../../utils/hooks';
import {useState} from 'react';

type AnimatedCommentProps = {
    comment: Comment;
    parent?: Comment;
};

const AnimatedComment: React.FC<AnimatedCommentProps> = ({comment, parent}) => {
    return (
        <Transition
            enter="transition-opacity duration-300 ease-out"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            show={true}
            appear
        >
            <EditableComment comment={comment} parent={parent} />
        </Transition>
    );
};

type EditableCommentProps = AnimatedCommentProps;
const EditableComment: React.FC<EditableCommentProps> = ({comment, parent}) => {
    const [isInEditMode, setIsInEditMode] = useState(false);

    const closeEditMode = () => {
        setIsInEditMode(false);
    };

    const openEditMode = () => {
        setIsInEditMode(true);
    };

    if (isInEditMode) {
        return (
            <EditForm close={closeEditMode} comment={comment} parent={parent} />
        );
    } else {
        return (<CommentComponent comment={comment} openEditMode={openEditMode} parent={parent} />);
    }
};

type CommentProps = AnimatedCommentProps & {
    openEditMode: () => void;
};
const CommentComponent: React.FC<CommentProps> = ({comment, parent, openEditMode}) => {
    const isPublished = isCommentPublished(comment);

    if (isPublished) {
        return (<PublishedComment comment={comment} openEditMode={openEditMode} parent={parent} />);
    }
    return (<UnpublishedComment comment={comment} openEditMode={openEditMode} />);
};

const PublishedComment: React.FC<CommentProps> = ({comment, parent, openEditMode}) => {
    const [isInReplyMode, setIsInReplyMode] = useState(false);
    const {dispatchAction} = useAppContext();

    const toggleReplyMode = async () => {
        if (!isInReplyMode) {
            // First load all the replies before opening the reply model
            await dispatchAction('loadMoreReplies', {comment, limit: 'all'});
        }
        setIsInReplyMode(current => !current);
    };

    const closeReplyMode = () => {
        setIsInReplyMode(false);
    };

    const hasReplies = isInReplyMode || (comment.replies && comment.replies.length > 0);
    const avatar = (<Avatar comment={comment} />);

    return (
        <CommentLayout avatar={avatar} hasReplies={hasReplies}>
            <CommentHeader comment={comment} />
            <CommentBody html={comment.html} />
            <CommentMenu comment={comment} isInReplyMode={isInReplyMode} openEditMode={openEditMode} parent={parent} toggleReplyMode={toggleReplyMode} />

            <RepliesContainer comment={comment} />
            <ReplyFormBox closeReplyMode={closeReplyMode} comment={comment} isInReplyMode={isInReplyMode} />
        </CommentLayout>
    );
};

type UnpublishedCommentProps = {
    comment: Comment;
    openEditMode: () => void;
}
const UnpublishedComment: React.FC<UnpublishedCommentProps> = ({comment, openEditMode}) => {
    const {admin} = useAppContext();

    let notPublishedMessage;
    if (admin && comment.status === 'hidden') {
        notPublishedMessage = 'This comment has been hidden.';
    } else {
        notPublishedMessage = 'This comment has been removed.';
    }

    const avatar = (<BlankAvatar />);
    const hasReplies = comment.replies && comment.replies.length > 0;

    return (
        <CommentLayout avatar={avatar} hasReplies={hasReplies}>
            <div className="mb-2 mt-[-3px] flex items-start">
                <div className="flex h-12 flex-row items-center gap-4 pb-[8px] pr-4">
                    <p className="mt-[4px] font-sans text-[16px] italic leading-normal text-[rgba(0,0,0,0.2)] dark:text-[rgba(255,255,255,0.35)]">{notPublishedMessage}</p>
                    <div className="mt-[4px]">
                        <MoreButton comment={comment} toggleEdit={openEditMode} />
                    </div>
                </div>
            </div>
            <RepliesContainer comment={comment} />
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
        <span>{memberExpertise}<span className="mx-[0.3em]">·</span></span>
    );
};

const EditedInfo: React.FC<{comment: Comment}> = ({comment}) => {
    if (!comment.edited_at) {
        return null;
    }
    return (
        <span>
            <span className="mx-[0.3em]">·</span>Edited
        </span>
    );
};

const RepliesContainer: React.FC<{comment: Comment}> = ({comment}) => {
    const hasReplies = comment.replies && comment.replies.length > 0;

    if (!hasReplies) {
        return null;
    }

    return (
        <div className="mb-4 mt-10 sm:mb-0">
            <Replies comment={comment} />
        </div>
    );
};

type ReplyFormBoxProps = {
    comment: Comment;
    isInReplyMode: boolean;
    closeReplyMode: () => void;
};
const ReplyFormBox: React.FC<ReplyFormBoxProps> = ({comment, isInReplyMode, closeReplyMode}) => {
    if (!isInReplyMode) {
        return null;
    }

    return (
        <div className="my-10">
            <ReplyForm close={closeReplyMode} parent={comment} />
        </div>
    );
};

//
// -- Published comment components --
//

// TODO: move name detection to helper
const AuthorName: React.FC<{comment: Comment}> = ({comment}) => {
    const name = !comment.member ? 'Deleted member' : (comment.member.name ? comment.member.name : 'Anonymous');
    return (
        <h4 className="text-[rgb(23,23,23] font-sans text-[17px] font-bold tracking-tight dark:text-[rgba(255,255,255,0.85)]">
            {name}
        </h4>
    );
};

const CommentHeader: React.FC<{comment: Comment}> = ({comment}) => {
    const createdAtRelative = useRelativeTime(comment.created_at);

    return (
        <div className="mb-2 mt-[-3px] flex items-start">
            <div>
                <AuthorName comment={comment} />
                <div className="flex items-baseline pr-4 font-sans text-[14px] tracking-tight text-[rgba(0,0,0,0.5)] dark:text-[rgba(255,255,255,0.5)]">
                    <span>
                        <MemberExpertise comment={comment}/>
                        <span title={formatExplicitTime(comment.created_at)}>{createdAtRelative}</span>
                        <EditedInfo comment={comment} />
                    </span>
                </div>
            </div>
        </div>
    );
};

const CommentBody: React.FC<{html: string}> = ({html}) => {
    const dangerouslySetInnerHTML = {__html: html};
    return (
        <div className="mt mb-2 flex flex-row items-center gap-4 pr-4">
            <p dangerouslySetInnerHTML={dangerouslySetInnerHTML} className="gh-comment-content font-sans text-[16px] leading-normal text-neutral-900 dark:text-[rgba(255,255,255,0.85)]" data-testid="comment-content"/>
        </div>
    );
};

type CommentMenuProps = {
    comment: Comment;
    toggleReplyMode: () => void;
    isInReplyMode: boolean;
    openEditMode: () => void;
    parent?: Comment;
};
const CommentMenu: React.FC<CommentMenuProps> = ({comment, toggleReplyMode, isInReplyMode, openEditMode, parent}) => {
    // If this comment is from the current member, always override member
    // with the member from the context, so we update the expertise in existing comments when we change it
    const {member, commentsEnabled} = useAppContext();

    const paidOnly = commentsEnabled === 'paid';
    const isPaidMember = member && !!member.paid;
    const canReply = member && (isPaidMember || !paidOnly) && !parent;

    return (
        <div className="flex items-center gap-5">
            {<LikeButton comment={comment} />}
            {(canReply && <ReplyButton isReplying={isInReplyMode} toggleReply={toggleReplyMode} />)}
            {<MoreButton comment={comment} toggleEdit={openEditMode} />}
        </div>
    );
};

//
// -- Layout --
//

const RepliesLine: React.FC<{hasReplies: boolean}> = ({hasReplies}) => {
    if (!hasReplies) {
        return null;
    }

    return (<div className="mb-2 h-full w-[3px] grow rounded bg-gradient-to-b from-[rgba(0,0,0,0.05)] via-[rgba(0,0,0,0.05)] to-transparent dark:from-[rgba(255,255,255,0.08)] dark:via-[rgba(255,255,255,0.08)]" />);
};

type CommentLayoutProps = {
    children: React.ReactNode;
    avatar: React.ReactNode;
    hasReplies: boolean;
}
const CommentLayout: React.FC<CommentLayoutProps> = ({children, avatar, hasReplies}) => {
    return (
        <div className={`flex w-full flex-row ${hasReplies === true ? 'mb-0' : 'mb-10'}`} data-testid="comment-component">
            <div className="mr-3 flex flex-col items-center justify-start">
                <div className="flex-0 mb-4">
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
