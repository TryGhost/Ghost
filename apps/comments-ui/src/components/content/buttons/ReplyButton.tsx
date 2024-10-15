import {ReactComponent as ReplyIcon} from '../../../images/icons/reply.svg';
import {useAppContext} from '../../../AppContext';

type Props = {
    disabled?: boolean;
    isReplying: boolean;
    toggleReply: () => void;
};
const ReplyButton: React.FC<Props> = ({disabled, isReplying, toggleReply}) => {
    const {member, t} = useAppContext();

    return member ?
        (<button className={`duration-50 group flex items-center font-sans text-base outline-0 transition-all ease-linear sm:text-sm ${isReplying ? 'text-black/90 dark:text-white/90' : 'text-black/50 hover:text-black/75 dark:text-white/60 dark:hover:text-white/75'}`} data-testid="reply-button" disabled={!!disabled} type="button" onClick={toggleReply}>
            <ReplyIcon className={`mr-[6px] ${isReplying ? 'fill-black dark:fill-white' : 'stroke-black/50 group-hover:stroke-black/75 dark:stroke-white/60 dark:group-hover:stroke-white/75'} duration-50 transition ease-linear`} />{t('Reply')}
        </button>) : null;
};

export default ReplyButton;
