import React, {useContext, useEffect, useState} from 'react';
import {Transition} from '@headlessui/react';
import Avatar from './Avatar';
import Like from './Like';
import Reply from './Reply';
import More from './More';
import Form from './Form';
import Replies from './Replies';
import AppContext from '../AppContext';
import {formatRelativeTime} from '../utils/helpers';

function EditedInfo({comment}) {
    if (!comment.edited_at) {
        return null;
    }
    return (
        <div>
            <span className="mx-[0.3em]">·</span>Edited
        </div>
    );
}

const Comment = ({updateIsEditing = null, isEditing, ...props}) => {
    const [isInEditMode, setIsInEditMode] = useState(false);
    const [isInReplyMode, setIsInReplyMode] = useState(false);
    useEffect(() => {
        updateIsEditing?.(isInReplyMode || isInEditMode);
    }, [updateIsEditing, isInReplyMode, isInEditMode]);
    const toggleEditMode = () => {
        setIsInEditMode(current => !current);
    };

    const closeEditMode = () => {
        setIsInEditMode(false);
    };

    const toggleReplyMode = () => {
        setIsInReplyMode(current => !current);
    };

    const closeReplyMode = () => {
        setIsInReplyMode(false);
    };

    const {admin, avatarSaturation, member, commentsEnabled} = useContext(AppContext);
    let comment = props.comment;
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isNotPublished = comment.status !== 'published';
    const html = {__html: comment.html};

    let notPublishedMessage;
    if (isNotPublished) {
        if (admin && comment.status === 'hidden') {
            notPublishedMessage = 'This comment has been hidden.';
        } else {
            notPublishedMessage = 'This comment has been removed.';
        }
    }

    const paidOnly = commentsEnabled === 'paid';
    const isPaidMember = member && !!member.paid;
    const canReply = member && (isPaidMember || !paidOnly);

    comment.member.bio = 'Head of Marketing'; // FOR TESTING

    if (isInEditMode) {
        return (
            <Form comment={comment} close={closeEditMode} parent={props.parent} isEdit={true} />
        );
    } else {
        return (
            <>
                <div className={`flex flex-row ${hasReplies ? 'mb-2 sm:mb-4' : 'mb-6 sm:mb-10'}`}>
                    <div>
                        <div className="flex items-center mb-2 h-12">
                            <div className="mr-3">
                                <Avatar comment={comment} saturation={avatarSaturation} isBlank={isNotPublished} />
                            </div>
                            {isNotPublished ?
                                <div>
                                    <p className="font-sans text-[16px] leading-normal text-neutral-400 italic mt-[4px]">{notPublishedMessage}</p>
                                </div> :
                                <div>
                                    <h4 className="text-[17px] font-sans font-bold tracking-tight dark:text-[rgba(255,255,255,0.85)]">{!comment.member ? 'Deleted member' : (comment.member.name ? comment.member.name : 'Anonymous')}</h4>
                                    <div className="flex items-baseline font-sans font-semibold text-[14px] tracking-tight text-neutral-400 dark:text-[rgba(255,255,255,0.5)]">
                                        {comment.member.bio && <div>{comment.member.bio}<span className="mx-[0.3em]">·</span></div>}
                                        <div>{formatRelativeTime(comment.created_at)}</div>
                                        <EditedInfo comment={comment} />
                                    </div>
                                </div>}
                        </div>

                        {!isNotPublished &&
                        <div className={`ml-12 sm:ml-[52px] mb-2 pr-4 font-sans leading-normal text-neutral-900 dark:text-[rgba(255,255,255,0.85)]`}>
                            <p dangerouslySetInnerHTML={html} className="gh-comment-content text-[16px] leading-normal"></p>
                        </div>}

                        <div className="ml-12 sm:ml-[52px] flex gap-5 items-center">
                            {!isNotPublished && <Like comment={comment} />}
                            {!isNotPublished && (canReply && (isNotPublished || !props.parent) && <Reply disabled={!!isEditing} comment={comment} toggleReply={toggleReplyMode} isReplying={isInReplyMode} />)}
                            <More comment={comment} toggleEdit={toggleEditMode} />
                        </div>
                    </div>
                </div>
                {hasReplies &&
                    <div className="ml-11 sm:ml-14 mt-8 sm:mt-10 mb-4 sm:mb-0">
                        <Replies comment={comment} />
                    </div>
                }
                <Transition
                    show={isInReplyMode}
                    enter="transition duration-500 delay-50 ease-in-out"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="transition-none duration-0"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="ml-14 my-10">
                        <Form parent={comment} close={closeReplyMode} isReply={true} />
                    </div>
                </Transition>
            </>
        );
    }
};

export default Comment;
