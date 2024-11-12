import EditForm from './forms/EditForm';
import LikeButton from './buttons/LikeButton';
import MoreButton from './buttons/MoreButton';
import Replies, {RepliesProps} from './Replies';
import ReplyButton from './buttons/ReplyButton';
import ReplyForm from './forms/ReplyForm';
import {Avatar, BlankAvatar} from './Avatar';
import {Comment, useAppContext, useLabs} from '../../AppContext';
import {Transition} from '@headlessui/react';
import {formatExplicitTime, getMemberNameFromComment, isCommentPublished} from '../../utils/helpers';
import {useRelativeTime} from '../../utils/hooks';
import {useState} from 'react';

type AnimatedCommentProps = {
    comment: Comment;
    parent?: Comment;
    toggleParentReplyMode?: () => Promise<void>;
};

const AnimatedComment: React.FC<AnimatedCommentProps> = ({comment, parent, toggleParentReplyMode}) => {
    return (
        <Transition
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
            <EditableComment comment={comment} parent={parent} toggleParentReplyMode={toggleParentReplyMode} />
        </Transition>
    );
};

type EditableCommentProps = AnimatedCommentProps;
const EditableComment: React.FC<EditableCommentProps> = ({comment, parent, toggleParentReplyMode}) => {
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
        return (<CommentComponent comment={comment} openEditMode={openEditMode} parent={parent} toggleParentReplyMode={toggleParentReplyMode} />);
    }
};

type CommentProps = AnimatedCommentProps & {
    openEditMode: () => void;
};
const CommentComponent: React.FC<CommentProps> = ({comment, parent, openEditMode, toggleParentReplyMode}) => {
    const isPublished = isCommentPublished(comment);

    if (isPublished) {
        return (<PublishedComment comment={comment} openEditMode={openEditMode} parent={parent} toggleParentReplyMode={toggleParentReplyMode} />);
    }
    return (<UnpublishedComment comment={comment} openEditMode={openEditMode} />);
};

const PublishedComment: React.FC<CommentProps> = ({comment, parent, openEditMode, toggleParentReplyMode}) => {
    const [isInReplyMode, setIsInReplyMode] = useState(false);
    const {dispatchAction} = useAppContext();

    const toggleReplyMode = async () => {
        if (parent && toggleParentReplyMode) {
            return await toggleParentReplyMode();
        }

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

            <RepliesContainer comment={comment} toggleReplyMode={toggleReplyMode} />
            <ReplyFormBox closeReplyMode={closeReplyMode} comment={comment} isInReplyMode={isInReplyMode} />
        </CommentLayout>
    );
};

type UnpublishedCommentProps = {
    comment: Comment;
    openEditMode: () => void;
}
const UnpublishedComment: React.FC<UnpublishedCommentProps> = ({comment, openEditMode}) => {
    const {t} = useAppContext();
    let notPublishedMessage:string = '';

    const avatar = (<BlankAvatar />);
    const hasReplies = comment.replies && comment.replies.length > 0;

    if (comment.status === 'hidden') {
        notPublishedMessage = t('This comment has been hidden.');
    } else if (comment.status === 'deleted') {
        notPublishedMessage = t('This comment has been removed.');
    }

    return (
        <CommentLayout avatar={avatar} hasReplies={hasReplies}>
            <div className="mt-[-3px] flex items-start">
                <div className="flex h-10 flex-row items-center gap-4 pb-[8px] pr-4">
                    <p className="text-md mt-[4px] font-sans italic leading-normal text-black/20 sm:text-lg dark:text-white/35">
                        {notPublishedMessage}
                    </p>
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

const RepliesContainer: React.FC<RepliesProps> = ({comment, toggleReplyMode}) => {
    const hasReplies = comment.replies && comment.replies.length > 0;

    if (!hasReplies) {
        return null;
    }

    return (
        <div className="mb-4 ml-[-1.4rem] mt-7 sm:mb-0 sm:mt-8">
            <Replies comment={comment} toggleReplyMode={toggleReplyMode} />
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
        <div className="my-8 sm:my-10">
            <ReplyForm close={closeReplyMode} parent={comment} />
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

const CommentHeader: React.FC<{comment: Comment}> = ({comment}) => {
    const createdAtRelative = useRelativeTime(comment.created_at);
    const {member} = useAppContext();
    const memberExpertise = member && comment.member && comment.member.uuid === member.uuid ? member.expertise : comment?.member?.expertise;

    return (
        <div className={`mb-2 mt-0.5 flex flex-wrap items-start sm:flex-row ${memberExpertise ? 'flex-col' : 'flex-row'}`}>
            <AuthorName comment={comment} />
            <div className="flex items-baseline pr-4 font-sans text-base leading-snug text-neutral-900/50 sm:text-sm dark:text-white/60">
                <span>
                    <MemberExpertise comment={comment}/>
                    <span title={formatExplicitTime(comment.created_at)}><span className="mx-[0.3em]">·</span>{createdAtRelative}</span>
                    <EditedInfo comment={comment} />
                </span>
            </div>
        </div>
    );
};

const CommentBody: React.FC<{html: string}> = ({html}) => {
    const dangerouslySetInnerHTML = {__html: html};
    return (
        <div className="mt mb-2 flex flex-row items-center gap-4 pr-4">
            <p dangerouslySetInnerHTML={dangerouslySetInnerHTML} className="gh-comment-content text-md text-pretty font-sans leading-normal text-neutral-900 [overflow-wrap:anywhere] sm:text-lg dark:text-white/85" data-testid="comment-content"/>
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
    const labs = useLabs();

    const paidOnly = commentsEnabled === 'paid';
    const isPaidMember = member && !!member.paid;
    const canReply = member && (isPaidMember || !paidOnly) && (labs.commentImprovements ? true : !parent);

    return (
        <div className="flex items-center gap-4">
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

    return (<div className="mb-2 h-full w-px grow rounded bg-gradient-to-b from-neutral-900/10 via-neutral-900/10 to-transparent dark:from-white/10 dark:via-white/10" />);
};

type CommentLayoutProps = {
    children: React.ReactNode;
    avatar: React.ReactNode;
    hasReplies: boolean;
}
const CommentLayout: React.FC<CommentLayoutProps> = ({children, avatar, hasReplies}) => {
    return (
        <div className={`flex w-full flex-row ${hasReplies === true ? 'mb-0' : 'mb-7'}`} data-testid="comment-component">
            <div className="mr-2 flex flex-col items-center justify-start sm:mr-3">
                <div className="flex-0 mb-3 sm:mb-4">
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
