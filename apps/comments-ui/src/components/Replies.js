import {useState, useEffect} from 'react';
import Comment from './Comment';
import RepliesPagination from './RepliesPagination';

const Replies = (props) => {
    const comment = props.comment;

    // Very basic pagination right now
    const MAX_VISIBLE_INITIAL = 3; // Show 3 first comments
    const PAGE_LENGTH = 5; // Load 5 extra when clicking more
    const [visibleReplies, setVisibleReplies] = useState([]);

    // This piece of code detects when new replies have been added to the comment
    // If that is the case, it makes sure all replies are visible (need design input here)
    useEffect(function () {
        setVisibleReplies((_visibleReplies) => {
            if (_visibleReplies.length === 0) {
                // Initial load
                return comment.replies.slice(0, MAX_VISIBLE_INITIAL);
            } else {
                return comment.replies.slice(0, comment.replies.length);
            }
        });
    }, [comment.replies]);

    const repliesLeft = comment.replies.length - visibleReplies.length;

    const loadMore = () => {
        const maxLength = visibleReplies.length + PAGE_LENGTH;
        setVisibleReplies(comment.replies.slice(0, maxLength));
    };

    return (
        <div>
            {visibleReplies.map((reply => <Comment comment={reply} parent={comment} key={reply.id} isReply={true} />))}
            {!!repliesLeft && <RepliesPagination count={repliesLeft} loadMore={loadMore}/>}
        </div>
    );
};

export default Replies;
