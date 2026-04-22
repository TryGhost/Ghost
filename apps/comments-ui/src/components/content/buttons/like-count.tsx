import {ReactComponent as LikeIcon} from '../../../images/icons/like.svg';

type Props = {
    count: number;
    liked: boolean;
};

const LikeCount: React.FC<Props> = ({count, liked}) => {
    return (
        <span
            className={`flex items-center font-sans text-base sm:text-sm ${
                liked ? 'text-black/90 dark:text-white/90' : 'text-black/50 dark:text-white/60'
            }`}
            data-testid="like-count"
        >
            <LikeIcon
                className={`mr-[6px] ${
                    liked ? 'fill-black stroke-black dark:fill-white dark:stroke-white' : 'stroke-black/50 dark:stroke-white/60'
                }`}
            />
            {count}
        </span>
    );
};

export default LikeCount;
