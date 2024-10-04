import CommentComponent from './Comment';
import RepliesPagination from './RepliesPagination';
import {Comment, useAppContext} from '../../AppContext';

export type RepliesProps = {
    comment: Comment,
    toggleReplyMode?: () => Promise<void>
};
const Replies: React.FC<RepliesProps> = ({comment, toggleReplyMode}) => {
    const {dispatchAction} = useAppContext();

    const repliesLeft = comment.count.replies - comment.replies.length;

    const loadMore = () => {
        dispatchAction('loadMoreReplies', {comment});
    };

    return (
        <div>
            {comment.replies.map((reply => <CommentComponent key={reply.id} comment={reply} parent={comment} toggleParentReplyMode={toggleReplyMode} />))}
            {repliesLeft > 0 && <RepliesPagination count={repliesLeft} loadMore={loadMore}/>}
        </div>
    );
};

export default Replies;
