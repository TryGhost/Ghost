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

    if (isNotPublished) {
        if (admin && comment.status === 'hidden') {
            html.__html = '<i>This comment has been hidden.</i>';
        } else {
            html.__html = '<i>This comment has been removed.</i>';
        }
    }

    const paidOnly = commentsEnabled === 'paid';
    const isPaidMember = member && !!member.paid;
    const canReply = member && (isPaidMember || !paidOnly);

    // comment.member.bio = 'Head of marketing'; FOR TESTING

    if (isInEditMode) {
        return (
            <Form comment={comment} close={closeEditMode} parent={props.parent} isEdit={true} />
        );
    } else {
        return (
            <>
                <div className={`flex flex-row ${hasReplies ? 'mb-2 sm:mb-4' : 'mb-6 sm:mb-10'}`}>
                    <div className="mr-3">
                        <Avatar comment={comment} saturation={avatarSaturation} isBlank={isNotPublished} />
                    </div>
                    <div>      
                        {!isNotPublished &&  
                        <div className="mb-[2px] sm:mb-[8px] -mt-[2px]">
                            <h4 className="text-[17px] font-sans font-bold tracking-tight dark:text-[rgba(255,255,255,0.85)]">{!comment.member ? 'Deleted member' : (comment.member.name ? comment.member.name : 'Anonymous')}</h4>
                            <div className="flex items-baseline font-sans text-[14px] tracking-tight text-neutral-400 dark:text-[rgba(255,255,255,0.5)]">
                                {comment.member.bio && <div className="font-semibold">Head of Marketing<span className="font-bold mx-[0.3em]">·</span></div>}
                                <div className={`${!comment.member.bio && 'font-semibold'}`}>{formatRelativeTime(comment.created_at)}</div>
                                {comment.edited_at && <div><span className="font-bold mx-[0.3em]">·</span>Edited</div>}
                            </div>
                        </div>}
   
                        <div className={`mb-[6px] pr-4 font-sans leading-normal ${isNotPublished ? 'text-neutral-400 mt-[4px]' : 'text-neutral-900'} dark:text-[rgba(255,255,255,0.85)]`}>
                            <p dangerouslySetInnerHTML={html} className="gh-comment-content text-[16px] leading-normal"></p>
                        </div>
                        <div className="flex gap-5 items-center">
                            {!isNotPublished && <Like comment={comment} />}
                            {!isNotPublished && (canReply && (isNotPublished || !props.parent) && <Reply comment={comment} toggleReply={toggleReplyMode} isReplying={isInReplyMode} />)}
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
