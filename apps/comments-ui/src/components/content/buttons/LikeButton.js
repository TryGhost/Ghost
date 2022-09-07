import {useContext, useState} from 'react';
import {ReactComponent as LikeIcon} from '../../../images/icons/like.svg';
import AppContext from '../../../AppContext';

function LikeButton(props) {
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
        <CustomTag className={`group duration-50 flex items-center font-sans text-sm outline-0 transition-all ease-linear ${props.comment.liked ? 'text-[rgba(0,0,0,0.9)] dark:text-[rgba(255,255,255,0.9)]' : 'text-[rgba(0,0,0,0.5)] dark:text-[rgba(255,255,255,0.5)]'} ${!props.comment.liked && canLike && 'hover:text-[rgba(0,0,0,0.75)] hover:dark:text-[rgba(255,255,255,0.25)]'} ${likeCursor}`} onClick={toggleLike} data-testid="like-button">
            <LikeIcon className={animationClass + ` mr-[6px] ${props.comment.liked ? 'fill-[rgba(0,0,0,0.9)] stroke-[rgba(0,0,0,0.9)] dark:fill-[rgba(255,255,255,0.9)] dark:stroke-[rgba(255,255,255,0.9)]' : 'stroke-[rgba(0,0,0,0.5)] dark:stroke-[rgba(255,255,255,0.5)]'} ${!props.comment.liked && canLike && 'group-hover:stroke-[rgba(0,0,0,0.75)] dark:group-hover:stroke-[rgba(255,255,255,0.25)]'} transition duration-50 ease-linear`} />
            {props.comment.count.likes}
        </CustomTag>
    );
}

export default LikeButton;
