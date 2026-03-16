import CommentComponent from './comment';
import RepliesPagination from './replies-pagination';
import {Comment, useAppContext} from '../../app-context';
import {useRef, useState} from 'react';

const INITIAL_REPLIES_SHOWN = 3;

export type RepliesProps = {
    comment: Comment
};
const Replies: React.FC<RepliesProps> = ({comment}) => {
    const {dispatchAction, commentIdToScrollTo} = useAppContext();
    const initialReplyIds = useRef(new Set(comment.replies.map(reply => reply.id)));

    const [showAll, setShowAll] = useState(() => {
        return !!commentIdToScrollTo
            && comment.replies.slice(INITIAL_REPLIES_SHOWN).some(reply => reply.id === commentIdToScrollTo);
    });

    const hasNewReplies = comment.replies.some(reply => !initialReplyIds.current.has(reply.id));
    const expanded = showAll || hasNewReplies;

    // The API may return fewer replies than count.replies (e.g. old API with LIMIT 3).
    // When that happens, "Show more" fetches the rest from the server first.
    const serverHasMore = comment.count.replies > comment.replies.length;
    const visibleReplies = expanded ? comment.replies : comment.replies.slice(0, INITIAL_REPLIES_SHOWN);
    const clientHiddenCount = comment.replies.length - visibleReplies.length;
    const totalHiddenCount = serverHasMore
        ? comment.count.replies - visibleReplies.length
        : clientHiddenCount;

    const loadMore = () => {
        if (serverHasMore) {
            dispatchAction('loadMoreReplies', {comment, limit: 'all'});
        }
        setShowAll(true);
    };

    return (
        <div>
            {visibleReplies.map((reply => <CommentComponent key={reply.id} comment={reply} parent={comment} />))}
            {totalHiddenCount > 0 && <RepliesPagination count={totalHiddenCount} loadMore={loadMore}/>}
        </div>
    );
};

export default Replies;
