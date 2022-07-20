import Comment from './Comment';
// import RepliesPagination from './RepliesPagination';

const Replies = (props) => {
    const comment = props.comment;

    return (
        <div>
            {comment.replies.map((reply => <Comment comment={reply} parent={comment} key={reply.id} isReply={true} />))}
            {/* <RepliesPagination /> */}
        </div>
    );
};

export default Replies;
