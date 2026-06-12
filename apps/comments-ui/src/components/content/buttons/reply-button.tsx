import ReplyIcon from '../../../images/icons/reply.svg?react';
import {Comment, useAppContext} from '../../../app-context';

type Props = {
    comment: Comment;
    disabled?: boolean;
    isReplying: boolean;
    openReplyForm: () => void;
};

const ReplyButton: React.FC<Props> = ({comment, disabled, isReplying, openReplyForm}) => {
    const {t, dispatchAction, isMember, hasRequiredTier} = useAppContext();

    const canReply = isMember && hasRequiredTier;

    const handleClick = () => {
        if (!canReply) {
            // Pass the comment id so the CTA's "Sign in" can ask Portal to return
            // the reader to this comment after signing in (see cta-box).
            dispatchAction('openPopup', {
                type: 'ctaPopup',
                commentId: comment.id
            });
            return;
        }
        openReplyForm();
    };

    return (
        <button
            className={`duration-50 group flex items-center font-sans text-base outline-0 transition-all ease-linear sm:text-sm ${isReplying ? 'text-black/90 dark:text-white/90' : 'text-black/50 hover:text-black/75 dark:text-white/60 dark:hover:text-white/75'}`}
            data-testid="reply-button"
            disabled={!!disabled}
            type="button"
            onClick={handleClick}
        >
            <ReplyIcon className={`mr-[6px] ${isReplying ? 'fill-black dark:fill-white' : 'stroke-black/50 group-hover:stroke-black/75 dark:stroke-white/60 dark:group-hover:stroke-white/75'} duration-50 transition ease-linear`} />
            {t('Reply')}
        </button>
    );
};

export default ReplyButton;
