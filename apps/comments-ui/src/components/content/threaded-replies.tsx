import React, {useMemo} from 'react';
import ReplyTree from './reply-tree';
import {Comment} from '../../app-context';
import {buildThreadedReplies} from '../../utils/thread-graph';

export type ThreadedRepliesProps = {
    comment: Comment;
    useThreading: boolean;
};

const ThreadedReplies: React.FC<ThreadedRepliesProps> = ({comment, useThreading}) => {
    const threadedReplies = useMemo(() => buildThreadedReplies(comment), [comment]);

    return (
        <div>
            <ReplyTree replies={threadedReplies} threadParentComment={comment} useThreading={useThreading} />
        </div>
    );
};

export default ThreadedReplies;
