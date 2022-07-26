import {useContext, useState} from 'react';
import {ReactComponent as LikeIcon} from '../images/icons/like.svg';
import AppContext from '../AppContext';

function Like(props) {
    const {dispatchAction, member, commentsEnabled} = useContext(AppContext);
    const [animationClass, setAnimation] = useState('');

    const paidOnly = commentsEnabled === 'paid';
    const isPaidMember = member && !!member.paid;
    const canLike = member && (isPaidMember || !paidOnly);

    const toggleLike = () => {
        if (!canLike) {
            return;
        }

        if (!props.comment.liked) {
            dispatchAction('likeComment', props.comment);
            setAnimation('animate-heartbeat');
            setTimeout(() => {
                setAnimation('');
            }, 400);
        } else {
            dispatchAction('unlikeComment', props.comment);
        }
    };

    // If can like: use <button> element, otherwise use a <span>
    const CustomTag = canLike ? `button` : `span`;

    let likeCursor = 'cursor-pointer';
    if (!canLike) {
        likeCursor = 'cursor-text';
    }

    return (
        <CustomTag className={`group transition-all duration-50 ease-linear flex font-sans items-center text-sm outline-0 ${props.comment.liked ? 'text-neutral-900 dark:text-[rgba(255,255,255,0.9)]' : 'text-neutral-400 dark:text-[rgba(255,255,255,0.5)]'} ${!props.comment.liked && canLike && 'hover:text-neutral-600'} ${likeCursor}`} onClick={toggleLike}>
            <LikeIcon className={animationClass + ` mr-[6px] ${props.comment.liked ? 'fill-neutral-900 stroke-neutral-900 dark:fill-white dark:stroke-white' : 'stroke-neutral-400 dark:stroke-[rgba(255,255,255,0.5)'} ${!props.comment.liked && canLike && 'group-hover:stroke-neutral-600'} transition duration-50 ease-linear`} />
            {props.comment.likes_count}
        </CustomTag>
    );
}

export default Like;
