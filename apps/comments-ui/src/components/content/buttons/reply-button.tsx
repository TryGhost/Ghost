import {ReactComponent as ReplyIcon} from '../../../images/icons/reply.svg';
import {useAppContext} from '../../../app-context';

type Props = {
    disabled?: boolean;
    isReplying: boolean;
    openReplyForm: () => void;
};

const ReplyButton: React.FC<Props> = ({disabled, isReplying, openReplyForm}) => {
    const {t, dispatchAction, isMember, hasRequiredTier} = useAppContext();

    const canReply = isMember && hasRequiredTier;

    const handleClick = () => {
        if (!canReply) {
            dispatchAction('openPopup', {
                type: 'ctaPopup'
            });
            return;
        }
        openReplyForm();
    };

    return (
        <button
            className={`group flex items-center font-sans text-base outline-0 transition-all duration-50 ease-linear sm:text-sm ${isReplying ? 'text-black/90 dark:text-white/90' : 'text-black/50 hover:text-black/75 dark:text-white/60 dark:hover:text-white/75'}`}
            data-testid="reply-button"
            disabled={!!disabled}
            type="button"
            onClick={handleClick}
        >
            <ReplyIcon className={`mr-[6px] ${isReplying ? 'fill-black dark:fill-white' : 'stroke-black/50 group-hover:stroke-black/75 dark:stroke-white/60 dark:group-hover:stroke-white/75'} transition duration-50 ease-linear`} />
            {t('Reply')}
        </button>
    );
};

export default ReplyButton;
