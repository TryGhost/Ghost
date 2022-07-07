import Comment from './Comment';

const Replies = (props) => {
    const comment = props.comment;

    return (
        <div>
            {comment.replies.map((reply => <Comment comment={reply} parent={comment} key={reply.id} isReply={true} avatarSaturation={props.avatarSaturation} />))}
        </div>
    );
};

export default Replies;
