import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import getUsername from '@utils/get-username';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, LucideIcon, Skeleton} from '@tryghost/shade';
import {toast} from 'sonner';
import {useFollowMutationForUser, useUnfollowMutationForUser} from '../../hooks/use-activity-pub-queries';
import {useNavigate} from '@tryghost/admin-x-framework';

type AvatarSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'notification';

interface FollowButtonProps {
    onFollow: (e: React.MouseEvent) => void;
    onUnfollow: (e: React.MouseEvent) => void;
    authorHandle: string;
    followedByMe: boolean;
}

// Global state to track which user was clicked via avatar button
let avatarClickedUser: string | null = null;

const FollowButton: React.FC<FollowButtonProps> = ({onFollow, onUnfollow, authorHandle, followedByMe}) => {
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);
    const isClickedUser = avatarClickedUser === authorHandle;
    const showCheckmark = isClickedUser && !followedByMe;

    const handleClick = (e: React.MouseEvent) => {
        if (showCheckmark) {
            onUnfollow(e);
            setTimeout(() => {
                avatarClickedUser = null;
                forceUpdate();
            }, 0);
        } else {
            avatarClickedUser = authorHandle;
            forceUpdate();
            onFollow(e);
        }
    };

    return (
        <Button
            className='absolute -right-1.5 bottom-px z-10 flex size-4 items-center justify-center rounded-full p-0 outline outline-2 outline-white transition-transform hover:scale-105 active:scale-100 dark:outline-black'
            title={showCheckmark ? 'Unfollow' : 'Follow'}
            onClick={handleClick}
        >
            {showCheckmark ? (
                <LucideIcon.Check className='-mb-px !size-3 !stroke-[2.4]' />
            ) : (
                <LucideIcon.Plus className='!size-[14px] !stroke-2' />
            )}
        </Button>
    );
};

interface APAvatarProps {
    author: {
        icon: {
            url: string;
        };
        name: string;
        handle?: string;
    } | undefined;
    size?: AvatarSize;
    isLoading?: boolean;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    showFollowButton?: boolean;
}

const APAvatar: React.FC<APAvatarProps> = ({author, size, isLoading = false, disabled = false, className = '', showFollowButton = false}) => {
    let iconSize = 20;
    let containerClass = `shrink-0 items-center justify-center rounded-full relative z-10 flex bg-black/5 dark:bg-gray-900 ${size === 'lg' || disabled ? '' : 'cursor-pointer'} ${className}`;
    let imageClass = 'z-10 object-cover rounded-full outline outline-[0.5px] outline-offset-[-0.5px] outline-black/10';
    const [iconUrl, setIconUrl] = useState(author?.icon?.url);
    const navigate = useNavigate();

    const followMutation = useFollowMutationForUser(
        'index',
        () => {
            toast.success(`Followed ${author?.name}`);
        },
        () => {
            toast.error('Failed to follow');
        }
    );

    const unfollowMutation = useUnfollowMutationForUser(
        'index',
        () => {
            toast.info(`Unfollowed ${author?.name}`);
        },
        () => {
            toast.error('Failed to unfollow');
        }
    );

    useEffect(() => {
        setIconUrl(author?.icon?.url);
    }, [author?.icon?.url]);

    switch (size) {
    case '2xs':
        iconSize = 10;
        containerClass = clsx('size-4', containerClass);
        imageClass = clsx('size-4', imageClass);
        break;
    case 'xs':
        iconSize = 12;
        containerClass = clsx('size-6', containerClass);
        imageClass = clsx('size-6', imageClass);
        break;
    case 'notification':
        iconSize = 16;
        containerClass = clsx('size-9', containerClass);
        imageClass = clsx('size-9', imageClass);
        break;
    case 'sm':
        containerClass = clsx('size-10', containerClass);
        imageClass = clsx('size-10', imageClass);
        break;
    case 'md':
        containerClass = clsx('size-[60px]', containerClass);
        imageClass = clsx('size-[60px]', imageClass);
        break;
    case 'lg':
        iconSize = 32;
        containerClass = clsx('size-22', containerClass);
        imageClass = clsx('size-22', imageClass);
        break;
    default:
        containerClass = clsx('size-10', containerClass);
        imageClass = clsx('size-10', imageClass);
        break;
    }

    if (!author || isLoading) {
        return <Skeleton className={imageClass} containerClassName={containerClass} />;
    }

    const handle = author?.handle || getUsername(author as ActorProperties);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/profile/${handle}`);
    };

    const handleFollowClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        followMutation.mutate(handle);
    };

    const handleUnfollowClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        unfollowMutation.mutate(handle);
    };

    const title = `${author?.name} ${handle}`;
    const isClickedUser = avatarClickedUser === handle;
    const displayFollowButton = showFollowButton || isClickedUser;

    if (iconUrl) {
        return (
            <div
                className={containerClass}
                title={title}
                onClick={size === 'lg' || disabled ? undefined : handleClick}
            >
                <img
                    className={imageClass}
                    referrerPolicy='no-referrer'
                    src={iconUrl}
                    onError={() => setIconUrl(undefined)}
                />
                {displayFollowButton && <FollowButton authorHandle={handle} followedByMe={false} onFollow={handleFollowClick} onUnfollow={handleUnfollowClick} />}
            </div>
        );
    }

    return (
        <div
            className={containerClass}
            title={title}
            onClick={disabled ? undefined : handleClick}
        >
            <LucideIcon.UserRound className='text-gray-600' size={iconSize} strokeWidth={1.5} />
            {displayFollowButton && <FollowButton authorHandle={handle} followedByMe={false} onFollow={handleFollowClick} onUnfollow={handleUnfollowClick} />}
        </div>
    );
};

export default APAvatar;