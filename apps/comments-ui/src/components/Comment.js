import Avatar from './Avatar';
import Like from './Like';
import Reply from './Reply';
import More from './More';

function Comment(props) {
    const comment = props.comment;

    return (
        <div className="mb-8">
            <div className="flex justify-between items-end mb-3">
                <div>
                    <Avatar />
                    <h4 className="text-lg font-sans font-semibold mb-1">{comment.member.name}</h4>
                    <h6 className="text-sm text-gray-400 font-sans">{comment.member.bio}</h6>
                </div>
                <div className="text-sm text-gray-400 font-sans font-normal">
                    2 mins ago
                </div>
            </div>
            <div className="mb-4 font-sans leading-normal">
                <p>{comment.html}</p>
            </div>
            <div className="flex">
                <Like />
                <Reply />
                <More />
            </div>
        </div>
    );
}
  
export default Comment;
