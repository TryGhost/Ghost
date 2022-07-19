import {useContext, useState} from 'react';
import {ReactComponent as LikeIcon} from '../images/icons/like.svg';
import AppContext from '../AppContext';

function Like(props) {
    const {onAction, member} = useContext(AppContext);
    const [animationClass, setAnimation] = useState('');

    let likeCursor = 'cursor-pointer';
    if (!member) {
        likeCursor = 'cursor-text';
    }

    const toggleLike = () => {
        if (member) {
            if (!props.comment.liked) {
                onAction('likeComment', props.comment);
                setAnimation('animate-heartbeat');
                setTimeout(() => {
                    setAnimation('');
                }, 400);
            } else {
                onAction('unlikeComment', props.comment);
            }
        }
    };

    return (
        <button className={`flex font-sans items-center text-sm ${props.comment.liked ? 'text-neutral-900 dark:text-[rgba(255,255,255,0.9)]' : 'text-neutral-400 dark:text-[rgba(255,255,255,0.5)]'} ${likeCursor}`} onClick={toggleLike}>
            <LikeIcon className={animationClass + ` mr-[6px] ${props.comment.liked ? 'fill-neutral-900 stroke-neutral-900 dark:fill-white dark:stroke-white' : 'stroke-neutral-400 dark:stroke-[rgba(255,255,255,0.5)]'}`} />
            {props.comment.likes_count}
        </button>
    );
}

export default Like;
