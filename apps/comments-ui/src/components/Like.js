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
        <button className={`flex font-sans items-center text-sm dark:text-white ${props.comment.liked ? 'text-neutral-900' : 'text-neutral-400'}`} onClick={toggleLike}>
            <LikeIcon className={`mr-[6px] stroke-neutral-400 ${props.comment.liked ? 'fill-neutral-900 stroke-neutral-900 dark:fill-white dark:stroke-white' : ''}`} />
            {props.comment.likes_count}
        </button>
    );
}

export default Like;
