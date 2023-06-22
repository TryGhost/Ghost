import {useContext} from 'react';
import AppContext from '../../AppContext';
import Comment from './Comment';
import RepliesPagination from './RepliesPagination';

const Replies = ({comment}) => {
    const {dispatchAction} = useContext(AppContext);

    const repliesLeft = comment.count.replies - comment.replies.length;

    const loadMore = () => {
        dispatchAction('loadMoreReplies', {comment});
    };

    return (
        <div>
            {comment.replies.map((reply => <Comment comment={reply} parent={comment} key={reply.id} isReply={true} />))}
            {repliesLeft > 0 && <RepliesPagination count={repliesLeft} loadMore={loadMore}/>}
        </div>
    );
};

export default Replies;
