import React, {useState} from 'react';
import {Button} from '@tryghost/admin-x-design-system';
import {ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {useDerepostMutationForUser, useLikeMutationForUser, useRepostMutationForUser, useUnlikeMutationForUser} from '../../hooks/useActivityPubQueries';

interface FeedItemStatsProps {
    object: ObjectProperties;
    likeCount: number;
    commentCount: number;
    layout: string;
    onLikeClick: () => void;
    onCommentClick: () => void;
}

const FeedItemStats: React.FC<FeedItemStatsProps> = ({
    object,
    likeCount,
    commentCount,
    layout,
    onLikeClick,
    onCommentClick
}) => {
    const [isLiked, setIsLiked] = useState(object.liked);
    const [isReposted, setIsReposted] = useState(object.reposted);
    const likeMutation = useLikeMutationForUser('index');
    const unlikeMutation = useUnlikeMutationForUser('index');
    const repostMutation = useRepostMutationForUser('index');
    const derepostMutation = useDerepostMutationForUser('index');

    const handleLikeClick = async (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        if (!isLiked) {
            likeMutation.mutate(object.id);
        } else {
            unlikeMutation.mutate(object.id);
        }
        setIsLiked(!isLiked);
        onLikeClick();
    };

    const buttonClassName = `transition-color flex p-2 items-center justify-center rounded-full bg-white leading-none text-grey-900 hover:bg-grey-100`;

    return (<div className={`flex ${(layout === 'inbox') ? 'flex-col' : 'gap-1'}`}>
        <Button
            className={buttonClassName}
            hideLabel={!isLiked || (layout === 'inbox')}
            icon='heart'
            iconColorClass={`w-[18px] h-[18px] ${isLiked && 'ap-red-heart text-red *:!fill-red hover:text-red'}`}
            id='like'
            label={new Intl.NumberFormat().format(likeCount)}
            size='md'
            title='Like'
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
            className={buttonClassName}
            icon='reload'
            iconColorClass={`w-[18px] h-[18px] ${isReposted && 'text-green'}`}
            id='repost'
            size='md'
            title={`${isReposted ? 'Undo repost' : 'Repost'}`}
            unstyled={true}
            onClick={(e?: React.MouseEvent<HTMLElement>) => {
                e?.stopPropagation();

                if (!isReposted) {
                    repostMutation.mutate(object.id);
                } else {
                    derepostMutation.mutate(object.id);
                }

                setIsReposted(!isReposted);
            }}
        />
    </div>);
};

export default FeedItemStats;
