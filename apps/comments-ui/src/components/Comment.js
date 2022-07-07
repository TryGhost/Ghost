import React, {useContext, useState} from 'react';
import {Transition} from '@headlessui/react';
import Avatar from './Avatar';
import Like from './Like';
import Reply from './Reply';
import More from './More';
import EditForm from './EditForm';
import Replies from './Replies';
import ReplyForm from './ReplyForm';
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
    const hasReplies = comment.replies && comment.replies.length > 0 && !!comment.replies.find(r => r.status === 'published');
    const isNotPublished = comment.status !== 'published';
    const html = {__html: comment.html};

    // Hide a comment if it has been deleted by the user and has no replies
    // But keep showing comments if hidden by admin and logged in as admin
    if ((comment.status === 'deleted' && !hasReplies) || (comment.status === 'hidden' && !hasReplies && !admin)) {
        return null;
    }

    if (isNotPublished) {
        html.__html = '<i>This comment has been removed.</i>';
    }

    if (isInEditMode) {
        return (
            <EditForm comment={comment} toggle={toggleEditMode} parent={props.parent} />
        );
    } else {
        return (
            <>
                <div className={`flex flex-col ${hasReplies ? 'mb-4' : 'mb-12'}`}>
                    <div>
                        <div className="flex justify-start items-center">
                            <Avatar comment={comment} saturation={props.avatarSaturation} />
                            <div className="ml-3">
                                <h4 className="text-lg font-sans font-semibold mb-1 tracking-tight dark:text-neutral-300">{comment.member.name}</h4>
                            </div>
                        </div>
                        <div className={`ml-14 mb-4 pr-4 font-sans leading-normal ${isNotPublished ? 'text-neutral-400' : 'text-neutral-900'} dark:text-neutral-300`}>
                            <p dangerouslySetInnerHTML={html} className="whitespace-pre-wrap text-[16.5px] leading-normal"></p>
                        </div>
                        <div className="ml-14 flex gap-5 items-center">
                            <Like comment={comment} />
                            {isNotPublished || !props.parent && <Reply comment={comment} toggleReply={toggleReplyMode} isReplying={isInReplyMode} />}
                            <h6 className="text-sm text-neutral-400 font-sans">{formatRelativeTime(comment.created_at)}</h6>
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
                        <ReplyForm parent={comment} toggle={toggleReplyMode} avatarSaturation={props.avatarSaturation} />
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
