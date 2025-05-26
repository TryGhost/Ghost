import React, {useEffect, useState} from 'react';
import {Button, LucideIcon} from '@tryghost/shade';
import {ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {useAnimatedCounter} from '@hooks/use-animated-counter';
import {useDerepostMutationForUser, useLikeMutationForUser, useRepostMutationForUser, useUnlikeMutationForUser} from '@hooks/use-activity-pub-queries';

interface FeedItemStatsProps {
    object: ObjectProperties;
    likeCount: number;
    commentCount: number;
    repostCount: number;
    layout: string;
    disabled?: boolean;
    buttonClassName?: string;
    onLikeClick: () => void;
    onCommentClick: () => void;
}

const FeedItemStats: React.FC<FeedItemStatsProps> = ({
    object,
    likeCount,
    commentCount,
    repostCount: initialRepostCount,
    layout,
    disabled = false,
    buttonClassName = '',
    onLikeClick,
    onCommentClick
}) => {
    const [isLiked, setIsLiked] = useState(object.liked);
    const [isReposted, setIsReposted] = useState(object.reposted);

    // Sync with external changes - Update the liked / reposted state when the object changes
    useEffect(() => {
        setIsLiked(object.liked);
        setIsReposted(object.reposted);
    }, [object.liked, object.reposted]);

    // Sync with external changes - Update the repost count when the initialRepostCount changes
    useEffect(() => {
        if (repostCount !== initialRepostCount) {
            if (initialRepostCount > repostCount) {
                incrementReposts();
            } else if (initialRepostCount < repostCount) {
                decrementReposts();
            }
        }
    }, [initialRepostCount]); // eslint-disable-line react-hooks/exhaustive-deps

    const likeMutation = useLikeMutationForUser('index');
    const unlikeMutation = useUnlikeMutationForUser('index');
    const repostMutation = useRepostMutationForUser('index');
    const derepostMutation = useDerepostMutationForUser('index');
    const {
        Counter: RepostCounter,
        currentValue: repostCount,
        increment: incrementReposts,
        decrement: decrementReposts
    } = useAnimatedCounter(initialRepostCount);

    const handleLikeClick = async (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        if (!isLiked) {
            likeMutation.mutate(object.id, {
                onError() {
                    setIsLiked(false);
                }
            });
        } else {
            unlikeMutation.mutate(object.id);
        }
        setIsLiked(!isLiked);
        onLikeClick();
    };

    const buttonClass = `px-2 gap-1.5 font-normal text-md [&_svg]:size-[18px] transition-color ap-action-button text-gray-900 hover:text-gray-900 hover:bg-black/[3%] dark:bg-black dark:hover:bg-gray-950 dark:text-gray-600 ${buttonClassName}`;

    return (<div className={`flex ${layout !== 'inbox' && 'gap-1'}`}>
        <Button
            className={`${buttonClass} ${isLiked && 'text-pink-500 hover:text-pink-500'}`}
            disabled={disabled}
            id='like'
            title={`${isLiked ? 'Undo like' : 'Like'}`}
            variant='ghost'
            onClick={(e?: React.MouseEvent<HTMLElement>) => {
                e?.stopPropagation();
                if (e) {
                    handleLikeClick(e);
                }
            }}
        >
            <LucideIcon.Heart className={`${isLiked && 'fill-pink-500 text-pink-500'}`} />
            {false && likeCount}
        </Button>
        <Button
            className={`${buttonClass}`}
            disabled={disabled}
            id='comment'
            title='Reply'
            variant='ghost'
            onClick={(e?: React.MouseEvent<HTMLElement>) => {
                e?.stopPropagation();
                onCommentClick();
            }}
        >
            <LucideIcon.MessageCircle />
            {!(commentCount === 0 || (layout === 'inbox')) && new Intl.NumberFormat().format(commentCount)}
        </Button>
        <Button
            className={`${buttonClass} ${isReposted && 'text-green-500 hover:text-green-500'}`}
            disabled={disabled}
            id='repost'
            title={`${isReposted ? 'Undo repost' : 'Repost'}`}
            variant='ghost'
            onClick={(e?: React.MouseEvent<HTMLElement>) => {
                e?.stopPropagation();

                if (!isReposted) {
                    repostMutation.mutate(object.id, {
                        onError() {
                            setIsReposted(false);
                            decrementReposts();
                        }
                    });
                    incrementReposts();
                } else {
                    derepostMutation.mutate(object.id);
                    decrementReposts();
                }

                setIsReposted(!isReposted);
            }}
        >
            <LucideIcon.RefreshCw className={`${isReposted && 'text-green-500'}`} />
            {!((initialRepostCount === 0 && !isReposted) || repostCount === 0 || (layout === 'inbox')) && RepostCounter}
        </Button>
    </div>);
};

export default FeedItemStats;
