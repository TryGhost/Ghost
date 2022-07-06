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
        <button className="flex font-sans text-[14px] items-center dark:text-white" onClick={toggleLike}>
            <LikeIcon className={`mr-1 stroke-black dark:stroke-white ${props.comment.liked ? 'fill-black dark:fill-white' : ''}`} />
            {props.comment.likes_count}
        </button>
    );
}

export default Like;
