import ThumbsUpIcon from '../../../images/icons/thumbs-up.svg?react';

type Props = {
    count: number;
    liked: boolean;
};

const LikeCount: React.FC<Props> = ({count, liked}) => {
    return (
        <div
            className="flex items-center gap-1.5"
            data-testid="like-count"
        >
            <ThumbsUpIcon
                className={`size-4 ${
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
