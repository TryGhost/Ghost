import {Comment, useAppContext} from '../../../AppContext';
import {ReactComponent as LikeIcon} from '../../../images/icons/like.svg';
import {useState} from 'react';

type Props = {
    comment: Comment;
};
const LikeButton: React.FC<Props> = ({comment}) => {
    const {dispatchAction, member, commentsEnabled} = useAppContext();
    const [animationClass, setAnimation] = useState('');

    const paidOnly = commentsEnabled === 'paid';
    const isPaidMember = member && !!member.paid;
    const canLike = member && (isPaidMember || !paidOnly);

    const toggleLike = () => {
        if (!canLike) {
            return;
        }

        if (!comment.liked) {
            dispatchAction('likeComment', comment);
            setAnimation('animate-heartbeat');
            setTimeout(() => {
                setAnimation('');
            }, 400);
        } else {
            dispatchAction('unlikeComment', comment);
        }
    };

    // If can like: use <button> element, otherwise use a <span>
    const CustomTag = canLike ? `button` : `span`;

    let likeCursor = 'cursor-pointer';
    if (!canLike) {
        likeCursor = 'cursor-text';
    }

    return (
        <CustomTag className={`duration-50 group flex items-center font-sans text-base outline-0 transition-all ease-linear sm:text-sm ${comment.liked ? 'text-black/90 dark:text-white/90' : 'text-black/50 hover:text-black/75 dark:text-white/60 dark:hover:text-white/75'} ${likeCursor}`} data-testid="like-button" type="button" onClick={toggleLike}>
            <LikeIcon className={animationClass + ` mr-[6px] ${comment.liked ? 'fill-black dark:fill-white stroke-black dark:stroke-white' : 'stroke-black/50 group-hover:stroke-black/75 dark:stroke-white/60 dark:group-hover:stroke-white/75'} ${!comment.liked && canLike && 'group-hover:stroke-black/75 dark:group-hover:stroke-white/75'} transition duration-50 ease-linear`} />
            {comment.count.likes}
        </CustomTag>
    );
};

export default LikeButton;
