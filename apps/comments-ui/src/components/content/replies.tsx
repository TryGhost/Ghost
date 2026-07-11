import CommentComponent from './comment';
import RepliesPagination from './replies-pagination';
import {Comment, useAppContext} from '../../app-context';
import {useRef, useState} from 'react';

const INITIAL_REPLIES_SHOWN = 3;

export type RepliesProps = {
    comment: Comment;
    useThreading?: boolean;
};
const Replies: React.FC<RepliesProps> = ({comment, useThreading = false}) => {
    const {commentIdToScrollTo} = useAppContext();
    const initialReplyIds = useRef(new Set(comment.replies.map(reply => reply.id)));

    const [showAll, setShowAll] = useState(() => {
        return !!commentIdToScrollTo
            && comment.replies.slice(INITIAL_REPLIES_SHOWN).some(reply => reply.id === commentIdToScrollTo);
    });

    const hasNewReplies = comment.replies.some(reply => !initialReplyIds.current.has(reply.id));
    const expanded = showAll || hasNewReplies;

    const visibleReplies = expanded ? comment.replies : comment.replies.slice(0, INITIAL_REPLIES_SHOWN);
    const hiddenRepliesCount = comment.replies.length - visibleReplies.length;

    const loadMore = () => {
        setShowAll(true);
    };

    return (
        <div>
            {visibleReplies.map((reply, idx) => (
                <CommentComponent
                    key={reply.id}
                    comment={reply}
                    isLastSibling={idx === visibleReplies.length - 1}
                    layoutVariant={useThreading ? 'reply' : 'root'}
                    parent={comment}
                    useThreading={useThreading}
                />
            ))}
            {hiddenRepliesCount > 0 && <RepliesPagination count={hiddenRepliesCount} loadMore={loadMore}/>}
        </div>
    );
};

export default Replies;
