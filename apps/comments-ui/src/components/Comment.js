import {formatRelativeTime} from '../utils/helpers';

function Comment(props) {
    const comment = props.comment;

    const html = {__html: comment.html};

    function getInitials() {
        if (!comment.member || !comment.member.name) {
            return '';
        }
        const parts = comment.member.name.split(' ');

        if (parts.length === 0) {
            return '';
        }

        if (parts.length === 1) {
            return parts[0].substring(0, 1);
        }

        return parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1);
    }
    
    return (
        <div className="flex mb-4">
            <div>
                <div className="flex mb-2 space-x-4 justify-start items-center">
                    <figure className="relative w-10 h-10">
                        <div className="flex justify-center items-center w-10 h-10 rounded-full bg-black">
                            <p className="text-white font-sans font-semibold">{ getInitials() }</p>
                        </div>
                        <img className="absolute top-0 left-0 w-10 h-10 rounded-full" src={comment.member.avatar_image} alt="Avatar"/>
                    </figure>
                    <div>
                        <h4 className="text-lg font-sans font-bold mb-1 tracking-tight dark:text-neutral-300">{comment.member.name}</h4>
                        <h6 className="text-xs text-neutral-400 font-sans">{formatRelativeTime(comment.created_at)}</h6>
                    </div>
                </div>
                <div className="ml-14 mb-4 font-sans leading-normal dark:text-neutral-300">
                    <p dangerouslySetInnerHTML={html} className="whitespace-pre-wrap"></p>
                </div>
            </div>
        </div>
    );
}
  
export default Comment;
