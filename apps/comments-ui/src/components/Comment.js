import Avatar from './Avatar';

function Comment(props) {
    const comment = props.comment;

    return (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-4">
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
        </div>
    );
}
  
export default Comment;
