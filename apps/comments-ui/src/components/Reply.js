import {ReactComponent as ReplyIcon} from '../images/icons/reply.svg';

function Reply() {
    return (
        <button className="flex font-sans text-[14px] items-center"><ReplyIcon className='gh-comments-icon gh-comments-icon-reply mr-1' />Reply</button>
    );
}
  
export default Reply;