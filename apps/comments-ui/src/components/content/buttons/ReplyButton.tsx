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
        (<button className={`duration-50 group flex items-center font-sans text-base outline-0 transition-all ease-linear sm:text-sm ${isReplying ? 'text-[rgba(0,0,0,0.9)] dark:text-[rgba(255,255,255,0.9)]' : 'text-[rgba(0,0,0,0.5)] hover:text-[rgba(0,0,0,0.75)] dark:text-[rgba(255,255,255,0.5)] dark:hover:text-[rgba(255,255,255,0.25)]'}`} data-testid="reply-button" disabled={!!disabled} type="button" onClick={toggleReply}>
            <ReplyIcon className={`mr-[6px] ${isReplying ? 'fill-[rgba(0,0,0,0.9)] stroke-[rgba(0,0,0,0.9)] dark:fill-[rgba(255,255,255,0.9)] dark:stroke-[rgba(255,255,255,0.9)]' : 'stroke-[rgba(0,0,0,0.5)] group-hover:stroke-[rgba(0,0,0,0.75)] dark:stroke-[rgba(255,255,255,0.5)] dark:group-hover:stroke-[rgba(255,255,255,0.25)]'} duration-50 transition ease-linear`} />{t('Reply')}
        </button>) : null;
};

export default ReplyButton;
