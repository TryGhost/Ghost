import React, {useState} from 'react';
import {Button} from '@tryghost/admin-x-design-system';
import {ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {useLikeMutationForUser, useUnlikeMutationForUser} from '../../hooks/useActivityPubQueries';

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
    const [isClicked, setIsClicked] = useState(false);
    const [isLiked, setIsLiked] = useState(object.liked);
    const likeMutation = useLikeMutationForUser('index');
    const unlikeMutation = useUnlikeMutationForUser('index');

    const handleLikeClick = async (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setIsClicked(true);
        if (!isLiked) {
            likeMutation.mutate(object.id);
        } else {
            unlikeMutation.mutate(object.id);
        }

        setIsLiked(!isLiked);
        onLikeClick();
        setTimeout(() => setIsClicked(false), 300);
    };

    return (<div className={`flex ${(layout === 'inbox') ? 'flex-col gap-2' : 'gap-5'}`}>
        <div className='flex gap-1'>
            <Button
                className={`self-start text-grey-900 transition-opacity hover:opacity-60 ${isClicked ? 'bump' : ''} ${isLiked ? 'ap-red-heart text-red *:!fill-red hover:text-red' : ''}`}
                hideLabel={true}
                icon='heart'
                id='like'
                size='md'
                unstyled={true}
                onClick={(e?: React.MouseEvent<HTMLElement>) => {
                    e?.stopPropagation();
                    if (e) {
                        handleLikeClick(e);
                    }
                }}
            />
            {isLiked && (layout !== 'inbox') && <span className={`text-grey-900`}>{new Intl.NumberFormat().format(likeCount)}</span>}
        </div>
        <div className='flex gap-1'>
            <Button
                className={`self-start text-grey-900 hover:opacity-60 ${isClicked ? 'bump' : ''}`}
                hideLabel={true}
                icon='comment'
                id='comment'
                size='md'
                unstyled={true}
                onClick={(e?: React.MouseEvent<HTMLElement>) => {
                    e?.stopPropagation();
                    onCommentClick();
                }}
            />
            {commentCount > 0 && (layout !== 'inbox') && (
                <span className={`text-grey-900`}>{new Intl.NumberFormat().format(commentCount)}</span>
            )}
        </div>
    </div>);
};

export default FeedItemStats; 