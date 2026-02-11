import CommentComponent from './comment';
import RepliesPagination from './replies-pagination';
import {Comment, useAppContext} from '../../app-context';

export type RepliesProps = {
    comment: Comment
};
const Replies: React.FC<RepliesProps> = ({comment}) => {
    const {dispatchAction} = useAppContext();

    const repliesLeft = comment.count.replies - comment.replies.length;

    const loadMore = () => {
        dispatchAction('loadMoreReplies', {comment});
    };

    return (
        <div>
            {comment.replies.map((reply => <CommentComponent key={reply.id} comment={reply} parent={comment} />))}
            {repliesLeft > 0 && <RepliesPagination count={repliesLeft} loadMore={loadMore}/>}
        </div>
    );
};

export default Replies;
