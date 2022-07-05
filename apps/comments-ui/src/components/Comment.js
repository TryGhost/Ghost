import Avatar from './Avatar';
import {formatRelativeTime} from '../utils/helpers';

function Comment(props) {
    const comment = props.comment;

    return (
        <div className="flex mb-4">
            <div className="mr-4">
                <Avatar />
            </div>
            <div className="mt-[2px]">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-lg font-sans font-semibold mb-1 dark:text-neutral-300">{comment.member.name}</h4>
                    {/* <h6 className="text-sm text-neutral-400 font-sans">{comment.member.bio}</h6> */}
                    <div className="text-sm text-neutral-400 font-sans font-normal">
                        {formatRelativeTime(comment.created_at)}
                    </div>
                </div>
                <div className="mb-4 font-sans leading-normal dark:text-neutral-300">
                    <p>{comment.html}</p>
                </div>
            </div>
        </div>
    );
}
  
export default Comment;
