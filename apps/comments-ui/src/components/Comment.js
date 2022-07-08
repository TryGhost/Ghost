import React, {useContext, useState} from 'react';
import {Transition} from '@headlessui/react';
import Avatar from './Avatar';
import Like from './Like';
import Reply from './Reply';
import More from './More';
import Form from './Form';
import Replies from './Replies';
import AppContext from '../AppContext';
import {formatRelativeTime} from '../utils/helpers';

const Comment = (props) => {
    const [isInEditMode, setIsInEditMode] = useState(false);
    const [isInReplyMode, setIsInReplyMode] = useState(false);

    const toggleEditMode = () => {
        setIsInEditMode(current => !current);
    };

    const toggleReplyMode = () => {
        setIsInReplyMode(current => !current);
    };

    const {admin} = useContext(AppContext);
    const comment = props.comment;
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isNotPublished = comment.status !== 'published';
    const html = {__html: comment.html};

    if (isNotPublished) {
        if (admin && comment.status === 'hidden') {
            html.__html = '<i>This comment has been hidden.</i>';
        } else {
            html.__html = '<i>This comment has been removed.</i>';
        }
    }

    if (isInEditMode) {
        return (
            <Form comment={comment} toggle={toggleEditMode} parent={props.parent} isEdit={true} />
        );
    } else {
        return (
            <>
                <div className={`flex flex-col ${hasReplies ? 'mb-4' : 'mb-12'}`}>
                    <div>
                        <div className="flex justify-start items-center">
                            <Avatar comment={comment} saturation={props.avatarSaturation} />
                            <div className="ml-3">
                                <h4 className="text-lg font-sans font-semibold mb-1 tracking-tight dark:text-[rgba(255,255,255,0.85)]">{comment.member.name}</h4>
                            </div>
                        </div>
                        <div className={`ml-14 mb-4 pr-4 font-sans leading-normal ${isNotPublished ? 'text-neutral-400' : 'text-neutral-900'} dark:text-[rgba(255,255,255,0.85)]`}>
                            <p dangerouslySetInnerHTML={html} className="gh-comment-content text-[16.5px] leading-normal"></p>
                        </div>
                        <div className="ml-14 flex gap-5 items-center">
                            <Like comment={comment} />
                            {(isNotPublished || !props.parent) && <Reply comment={comment} toggleReply={toggleReplyMode} isReplying={isInReplyMode} />}
                            <h6 className="text-sm text-neutral-400 dark:text-[rgba(255,255,255,0.5)] font-sans">{formatRelativeTime(comment.created_at)}</h6>
                            <More comment={comment} toggleEdit={toggleEditMode} />
                        </div>
                    </div>    
                </div>
                <Transition
                    show={isInReplyMode}
                    enter="transition duration-500 ease-in-out"
                    enterFrom="opacity-0 -translate-y-2"
                    enterTo="opacity-100 translate-x-0"
                    leave="transition-none duration-0"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="ml-14 my-10">
                        <Form parent={comment} toggle={toggleReplyMode} avatarSaturation={props.avatarSaturation} isReply={true} />
                    </div>
                </Transition>
                {hasReplies && 
                    <div className="ml-14 mt-10">
                        <Replies comment={comment} avatarSaturation={props.avatarSaturation} />
                    </div>
                }
            </>
        );
    }
};

export default Comment;
