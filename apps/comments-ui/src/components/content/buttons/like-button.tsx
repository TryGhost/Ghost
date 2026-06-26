import ThumbsDownIcon from '../../../images/icons/thumbs-down.svg?react';
import ThumbsUpIcon from '../../../images/icons/thumbs-up.svg?react';
import {Comment, useAppContext} from '../../../app-context';
import {useState} from 'react';

type Props = {
    comment: Comment;
    disabled?: boolean;
    setDisabled?: (disabled: boolean) => void;
};
const LikeButton: React.FC<Props> = ({comment, disabled, setDisabled}) => {
    const {dispatchAction, isMember, hasRequiredTier, t} = useAppContext();
    const [likeAnimation, setLikeAnimation] = useState('');
    const [localDisabled, setLocalDisabled] = useState(false);

    const canInteract = isMember && hasRequiredTier;
    const likesCount = comment.count.likes;
    const buttonDisabled = disabled ?? localDisabled;
    const setButtonDisabled = setDisabled ?? setLocalDisabled;

    const openCta = () => {
        // Pass the comment id so the CTA's "Sign in" can ask Portal to return
        // the reader to this comment after signing in (see cta-box).
        dispatchAction('openPopup', {
            type: 'ctaPopup',
            commentId: comment.id
        });
    };

    const toggleLike = async () => {
        if (!canInteract) {
            openCta();
            return;
        }

        setButtonDisabled(true);
        try {
            if (!comment.liked) {
                await dispatchAction('likeComment', comment);
                setLikeAnimation('animate-heartbeat');
                setTimeout(() => {
                    setLikeAnimation('');
                }, 400);
            } else {
                await dispatchAction('unlikeComment', comment);
            }
        } finally {
            setButtonDisabled(false);
        }
    };

    return (
        <button
            aria-label={comment.liked ? t('Remove like') : t('Like')}
            className={`duration-50 group flex cursor-pointer items-center gap-1.5 font-sans text-base outline-0 transition-all ease-linear sm:text-sm ${
                comment.liked ? 'text-black/90 dark:text-white/90' : 'text-black/50 hover:text-black/75 dark:text-white/60 dark:hover:text-white/75'
            }`}
            data-testid="like-button"
            disabled={buttonDisabled}
            type="button"
            onClick={toggleLike}
        >
            <ThumbsUpIcon
                className={likeAnimation + ` h-4 w-4 ${
                    comment.liked ? 'fill-black dark:fill-white stroke-black dark:stroke-white' : 'stroke-black/50 group-hover:stroke-black/75 dark:stroke-white/60 dark:group-hover:stroke-white/75'
                } ${!comment.liked && canInteract && 'group-hover:stroke-black/75 dark:group-hover:stroke-white/75'} transition duration-50 ease-linear`}
            />
            <span className="tabular-nums">
                {likesCount}
            </span>
        </button>
    );
};

export const DislikeButton: React.FC<Props> = ({comment, disabled, setDisabled}) => {
    const {dispatchAction, isMember, hasRequiredTier, t} = useAppContext();
    const [dislikeAnimation, setDislikeAnimation] = useState('');
    const [localDisabled, setLocalDisabled] = useState(false);

    const canInteract = isMember && hasRequiredTier;
    const buttonDisabled = disabled ?? localDisabled;
    const setButtonDisabled = setDisabled ?? setLocalDisabled;

    const openCta = () => {
        // Pass the comment id so the CTA's "Sign in" can ask Portal to return
        // the reader to this comment after signing in (see cta-box).
        dispatchAction('openPopup', {
            type: 'ctaPopup',
            commentId: comment.id
        });
    };

    const toggleDislike = async () => {
        if (!canInteract) {
            openCta();
            return;
        }

        setButtonDisabled(true);
        try {
            if (!comment.disliked) {
                await dispatchAction('dislikeComment', comment);
                setDislikeAnimation('animate-heartbeat');
                setTimeout(() => {
                    setDislikeAnimation('');
                }, 400);
            } else {
                await dispatchAction('undislikeComment', comment);
            }
        } finally {
            setButtonDisabled(false);
        }
    };

    return (
        <button
            aria-label={comment.disliked ? t('Remove dislike') : t('Dislike')}
            className={`duration-50 group flex cursor-pointer items-center font-sans text-base outline-0 transition-all ease-linear sm:text-sm ${
                comment.disliked ? 'text-black/90 dark:text-white/90' : 'text-black/50 hover:text-black/75 dark:text-white/60 dark:hover:text-white/75'
            }`}
            data-testid="dislike-button"
            disabled={buttonDisabled}
            type="button"
            onClick={toggleDislike}
        >
            <ThumbsDownIcon
                className={dislikeAnimation + ` h-4 w-4 ${
                    comment.disliked ? 'fill-black dark:fill-white stroke-black dark:stroke-white' : 'stroke-black/50 group-hover:stroke-black/75 dark:stroke-white/60 dark:group-hover:stroke-white/75'
                } ${!comment.disliked && canInteract && 'group-hover:stroke-black/75 dark:group-hover:stroke-white/75'} transition duration-50 ease-linear`}
            />
        </button>
    );
};

export default LikeButton;
