import {Comment, useAppContext} from '../../../app-context';
import {ReactComponent as ThumbsDownIcon} from '../../../images/icons/thumbs-down.svg';
import {ReactComponent as ThumbsUpIcon} from '../../../images/icons/thumbs-up.svg';
import {useState} from 'react';

type Props = {
    comment: Comment;
};
const LikeButton: React.FC<Props> = ({comment}) => {
    const {dispatchAction, isMember, hasRequiredTier} = useAppContext();
    const [likeAnimation, setLikeAnimation] = useState('');
    const [dislikeAnimation, setDislikeAnimation] = useState('');
    const [disabled, setDisabled] = useState(false);

    const canInteract = isMember && hasRequiredTier;
    const netScore = comment.count.likes - comment.count.dislikes;

    const openCta = () => {
        dispatchAction('openPopup', {
            type: 'ctaPopup'
        });
    };

    const toggleLike = async () => {
        if (!canInteract) {
            openCta();
            return;
        }

        setDisabled(true);
        if (!comment.liked) {
            await dispatchAction('likeComment', comment);
            setLikeAnimation('animate-heartbeat');
            setTimeout(() => {
                setLikeAnimation('');
            }, 400);
        } else {
            await dispatchAction('unlikeComment', comment);
        }
        setDisabled(false);
    };

    const toggleDislike = async () => {
        if (!canInteract) {
            openCta();
            return;
        }

        setDisabled(true);
        if (!comment.disliked) {
            await dispatchAction('dislikeComment', comment);
            setDislikeAnimation('animate-heartbeat');
            setTimeout(() => {
                setDislikeAnimation('');
            }, 400);
        } else {
            await dispatchAction('undislikeComment', comment);
        }
        setDisabled(false);
    };

    return (
        <div className="flex items-center gap-1.5" data-testid="vote-buttons">
            <button
                className={`duration-50 group flex cursor-pointer items-center font-sans text-base outline-0 transition-all ease-linear sm:text-sm ${
                    comment.liked ? 'text-black/90 dark:text-white/90' : 'text-black/50 hover:text-black/75 dark:text-white/60 dark:hover:text-white/75'
                }`}
                data-testid="like-button"
                disabled={disabled}
                type="button"
                onClick={toggleLike}
            >
                <ThumbsUpIcon
                    className={likeAnimation + ` h-4 w-4 ${
                        comment.liked ? 'fill-black dark:fill-white stroke-black dark:stroke-white' : 'stroke-black/50 group-hover:stroke-black/75 dark:stroke-white/60 dark:group-hover:stroke-white/75'
                    } ${!comment.liked && canInteract && 'group-hover:stroke-black/75 dark:group-hover:stroke-white/75'} transition duration-50 ease-linear`}
                />
            </button>
            <span className={`min-w-[2ch] text-center font-sans text-base tabular-nums sm:text-sm ${
                comment.liked ? 'text-black/90 dark:text-white/90' : comment.disliked ? 'text-black/90 dark:text-white/90' : 'text-black/50 dark:text-white/60'
            }`}>
                {netScore}
            </span>
            <button
                className={`duration-50 group flex cursor-pointer items-center font-sans text-base outline-0 transition-all ease-linear sm:text-sm ${
                    comment.disliked ? 'text-black/90 dark:text-white/90' : 'text-black/50 hover:text-black/75 dark:text-white/60 dark:hover:text-white/75'
                }`}
                data-testid="dislike-button"
                disabled={disabled}
                type="button"
                onClick={toggleDislike}
            >
                <ThumbsDownIcon
                    className={dislikeAnimation + ` h-4 w-4 ${
                        comment.disliked ? 'fill-black dark:fill-white stroke-black dark:stroke-white' : 'stroke-black/50 group-hover:stroke-black/75 dark:stroke-white/60 dark:group-hover:stroke-white/75'
                    } ${!comment.disliked && canInteract && 'group-hover:stroke-black/75 dark:group-hover:stroke-white/75'} transition duration-50 ease-linear`}
                />
            </button>
        </div>
    );
};

export default LikeButton;
