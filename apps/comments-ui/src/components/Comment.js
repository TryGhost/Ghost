import {formatRelativeTime} from '../utils/helpers';
import React, {useState} from 'react';
import Avatar from './Avatar';
import Like from './Like';
import Reply from './Reply';
import More from './More';
import EditForm from './EditForm';
import Replies from './Replies';
import ReplyForm from './ReplyForm';

const Comment = (props) => {
    const [isInEditMode, setIsInEditMode] = useState(false);
    const [isInReplyMode, setIsInReplyMode] = useState(false);

    const toggleEditMode = () => {
        setIsInEditMode(current => !current);
    };

    const toggleReplyMode = () => {
        setIsInReplyMode(current => !current);
    };

    const comment = props.comment;
    const isReply = props.isReply;
    const hasReplies = comment.replies && comment.replies.length > 0;
    const html = {__html: comment.html};

    let commentMarginBottom;
    if (!hasReplies) {
        commentMarginBottom = 'mb-10';
    }
    if (hasReplies) {
        commentMarginBottom = 'mb-4';
    }
    if (isReply) {
        commentMarginBottom = 'mb-10';
    }

    if (comment.status !== 'published') {
        html.__html = '<i>This comment has been removed.</i>';
    }

    if (isInEditMode) {
        return (
            <EditForm comment={comment} toggle={toggleEditMode} parent={props.parent} />
        );
    } else {
        return (
            <div className={`flex flex-col ${commentMarginBottom}`}>
                <div>
                    <div className="flex mb-4 space-x-4 justify-start items-center">
                        <Avatar comment={comment} />
                        <div>
                            <h4 className="text-lg font-sans font-bold mb-1 tracking-tight dark:text-neutral-300">{comment.member.name}</h4>
                            <h6 className="text-[13px] text-neutral-400 font-sans">{formatRelativeTime(comment.created_at)}</h6>
                        </div>
                    </div>
                    <div className="mb-4 pr-4 font-sans leading-normal dark:text-neutral-300">
                        <p dangerouslySetInnerHTML={html} className="whitespace-pre-wrap"></p>
                    </div>
                    <div className="flex gap-6">
                        <Like comment={comment} />
                        {!props.parent && <Reply comment={comment} toggleReply={toggleReplyMode} isReplying={isInReplyMode} />}
                        <More comment={comment} toggleEdit={toggleEditMode} />
                    </div>
                </div>    
                {hasReplies && 
                    <div className="ml-14 mt-14">
                        <Replies comment={comment} />
                    </div>
                }
                {isInReplyMode &&
                    <div className={`ml-14 ${!hasReplies && 'mt-10'}`}>
                        <ReplyForm parent={comment} toggle={toggleReplyMode} />
                    </div>
                }
            </div>
        );
    }
};

export default Comment;
