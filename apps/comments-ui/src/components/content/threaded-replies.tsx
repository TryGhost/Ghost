import ReplyTree from './reply-tree';
import { buildThreadedReplies } from '../../utils/thread-graph';
import { useMemo } from 'preact/hooks';
import type { Comment } from '../../app-context';
import type { FunctionComponent } from 'preact';

export type ThreadedRepliesProps = {
  comment: Comment;
};

const ThreadedReplies: FunctionComponent<ThreadedRepliesProps> = ({ comment }) => {
  const threadedReplies = useMemo(() => buildThreadedReplies(comment), [comment]);

  return (
    <div>
      <ReplyTree replies={threadedReplies} threadParentComment={comment} />
    </div>
  );
};

export default ThreadedReplies;
