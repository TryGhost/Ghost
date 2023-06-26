import Comment from './Comment';
import RepliesPagination from './RepliesPagination';
import {useAppContext} from '../../AppContext';
import {useContext} from 'react';

const Replies = ({comment}) => {
    const {dispatchAction} = useAppContext();

    const repliesLeft = comment.count.replies - comment.replies.length;

    const loadMore = () => {
        dispatchAction('loadMoreReplies', {comment});
    };

    return (
        <div>
            {comment.replies.map((reply => <Comment key={reply.id} comment={reply} isReply={true} parent={comment} />))}
            {repliesLeft > 0 && <RepliesPagination count={repliesLeft} loadMore={loadMore}/>}
        </div>
    );
};

export default Replies;
