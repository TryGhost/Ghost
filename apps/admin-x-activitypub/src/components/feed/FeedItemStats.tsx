import React, {useEffect, useState} from 'react';
import {Button} from '@tryghost/admin-x-design-system';
import {ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {useAnimatedCounter} from '@hooks/use-animated-counter';
import {useDerepostMutationForUser, useRepostMutationForUser} from '@hooks/use-activity-pub-queries';
import {useLike} from '../../state/post/hooks';

interface FeedItemStatsProps {
    object: ObjectProperties;
    likeCount: number;
    commentCount: number;
    repostCount: number;
    layout: string;
    onLikeClick?: () => void;
    onCommentClick: () => void;
}

const FeedItemStats: React.FC<FeedItemStatsProps> = ({
    object,
    likeCount,
    commentCount,
    repostCount: initialRepostCount,
    layout,
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

    const {like, unlike} = useLike({handle: 'index'});
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
            like(object.id);
        } else {
            unlike(object.id);
        }
        setIsLiked(!isLiked);
        onLikeClick?.();
    };

    const buttonClassName = `transition-color flex p-2 ap-action-button items-center justify-center rounded-md bg-white text-gray-900 leading-none hover:bg-gray-100 dark:bg-black dark:hover:bg-gray-950 dark:text-gray-600`;

    return (<div className={`flex ${layout !== 'inbox' && 'gap-1'}`}>
        <Button
            className={`${buttonClassName} ${isLiked ? 'text-red-600' : 'text-gray-900'}`}
            hideLabel={true}
            icon='heart'
            iconColorClass={`w-[18px] h-[18px] ${isLiked && 'ap-red-heart text-red-600 *:!fill-red-600 hover:text-red-600'}`}
            id='like'
            label={new Intl.NumberFormat().format(likeCount)}
            size='md'
            title={`${isLiked ? 'Undo like' : 'Like'}`}
            unstyled={true}
            onClick={(e?: React.MouseEvent<HTMLElement>) => {
                e?.stopPropagation();
                if (e) {
                    handleLikeClick(e);
                }
            }}
        />
        <Button
            className={buttonClassName}
            hideLabel={commentCount === 0 || (layout === 'inbox')}
            icon='comment'
            iconColorClass='w-[18px] h-[18px]'
            id='comment'
            label={new Intl.NumberFormat().format(commentCount)}
            size='md'
            title='Reply'
            unstyled={true}
            onClick={(e?: React.MouseEvent<HTMLElement>) => {
                e?.stopPropagation();
                onCommentClick();
            }}
        />
        <Button
            className={`${buttonClassName} ${isReposted ? 'text-green-500' : 'text-gray-900'}`}
            hideLabel={(initialRepostCount === 0 && !isReposted) || repostCount === 0 || (layout === 'inbox')}
            icon='reload'
            iconColorClass={`w-[18px] h-[18px] ${isReposted && 'text-green-500'}`}
            id='repost'
            label={RepostCounter}
            size='md'
            title={`${isReposted ? 'Undo repost' : 'Repost'}`}
            unstyled={true}
            onClick={(e?: React.MouseEvent<HTMLElement>) => {
                e?.stopPropagation();

                if (!isReposted) {
                    repostMutation.mutate(object.id);
                    incrementReposts();
                } else {
                    derepostMutation.mutate(object.id);
                    decrementReposts();
                }

                setIsReposted(!isReposted);
            }}
        />
    </div>);
};

export default FeedItemStats;
