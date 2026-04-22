import {ReactComponent as ThumbsDownIcon} from '../../../images/icons/thumbs-down.svg';
import {ReactComponent as ThumbsUpIcon} from '../../../images/icons/thumbs-up.svg';

type Props = {
    count: number;
    liked: boolean;
    disliked: boolean;
};

const LikeCount: React.FC<Props> = ({count, liked, disliked}) => {
    return (
        <div
            className="flex items-center gap-1.5"
            data-testid="like-count"
        >
            <ThumbsUpIcon
                className={`h-4 w-4 ${
                    liked ? 'fill-black stroke-black dark:fill-white dark:stroke-white' : 'stroke-black/50 dark:stroke-white/60'
                }`}
            />
            <span className={`min-w-[2ch] text-center font-sans text-base tabular-nums sm:text-sm ${
                liked ? 'text-black/90 dark:text-white/90' : 'text-black/50 dark:text-white/60'
            }`}>
                {count}
            </span>
            <ThumbsDownIcon
                className={`h-4 w-4 ${
                    disliked ? 'fill-black stroke-black dark:fill-white dark:stroke-white' : 'stroke-black/50 dark:stroke-white/60'
                }`}
            />
        </div>
    );
};

export default LikeCount;
