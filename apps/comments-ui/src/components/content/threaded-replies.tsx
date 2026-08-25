import React, { useMemo } from 'react';
import ReplyTree from './reply-tree';
import { Comment } from '../../app-context';
import { buildThreadedReplies } from '../../utils/thread-graph';

export type ThreadedRepliesProps = {
  comment: Comment;
};

const ThreadedReplies: React.FC<ThreadedRepliesProps> = ({ comment }) => {
  const threadedReplies = useMemo(() => buildThreadedReplies(comment), [comment]);

  return (
    <div>
      <ReplyTree replies={threadedReplies} threadParentComment={comment} />
    </div>
  );
};

export default ThreadedReplies;
