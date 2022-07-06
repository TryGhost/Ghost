import Comment from './Comment';

const Replies = (props) => {
    return (
        <div>
            {props.replies.map((reply => <Comment comment={reply} key={reply.id} />))}
        </div>
    );
};

export default Replies;
