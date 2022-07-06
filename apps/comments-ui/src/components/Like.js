import {useContext} from 'react';
import {ReactComponent as LikeIcon} from '../images/icons/like.svg';
import AppContext from '../AppContext';

function Like(props) {
    const {onAction} = useContext(AppContext);

    const toggleLike = () => {
        if (!props.comment.liked) {
            onAction('likeComment', props.comment);
        } else {
            onAction('unlikeComment', props.comment);
        }
    };

    return (
        <button className="flex font-sans text-[14px] items-center" onClick={toggleLike}>
            <LikeIcon className={`gh-comments-icon gh-comments-icon-like mr-1 ${props.comment.liked ? 'fill-black' : ''}`} />
            {props.comment.likes_count}
        </button>
    );
}

export default Like;
