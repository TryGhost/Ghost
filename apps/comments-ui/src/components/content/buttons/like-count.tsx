import LikeIcon from '../../../images/icons/like.svg?react';
import ThumbsUpIcon from '../../../images/icons/thumbs-up.svg?react';
import {useAppContext} from '../../../app-context';

type Props = {
    count: number;
    liked: boolean;
};

const LikeCount: React.FC<Props> = ({count, liked}) => {
    const {capabilities} = useAppContext();
    const dislikesEnabled = capabilities?.dislikes === true;

    if (!dislikesEnabled) {
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
    }

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
            <span className={`font-sans text-base tabular-nums sm:text-sm ${
                liked ? 'text-black/90 dark:text-white/90' : 'text-black/50 dark:text-white/60'
            }`}>
                {count}
            </span>
        </div>
    );
};

export default LikeCount;
