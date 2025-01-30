import clsx from 'clsx';
import {Button} from '@tryghost/admin-x-design-system';
import {useEffect, useState} from 'react';
import {useFollow, useUnfollow} from '../../hooks/useActivityPubQueries';

interface FollowButtonProps {
    className?: string;
    following: boolean;
    handle: string;
    type?: 'primary' | 'secondary';
    onFollow?: () => void;
    onUnfollow?: () => void;
}

const noop = () => {};

const FollowButton: React.FC<FollowButtonProps> = ({
    className,
    following,
    handle,
    type = 'secondary',
    onFollow = noop,
    onUnfollow = noop
}) => {
    const [isFollowing, setIsFollowing] = useState(following);
    const [isHovered, setIsHovered] = useState(false);

    const unfollowMutation = useUnfollow('index',
        noop,
        () => {
            setIsFollowing(false);
            onUnfollow();
        }
    );

    const followMutation = useFollow('index',
        noop,
        () => {
            setIsFollowing(false);
            onUnfollow();
        }
    );

    const handleClick = async () => {
        if (isFollowing) {
            setIsFollowing(false);
            onUnfollow();
            unfollowMutation.mutate(handle);
        } else {
            setIsFollowing(true);
            onFollow();
            followMutation.mutate(handle);
        }
    };

    useEffect(() => {
        setIsFollowing(following);
    }, [following]);

    const color = (type === 'primary') ? 'black' : 'grey';
    const size = (type === 'primary') ? 'md' : 'sm';
    const minWidth = (type === 'primary') ? 'min-w-[96px]' : 'min-w-[88px]';

    return (
        <Button
            className={clsx(
                className,
                isFollowing && minWidth
            )}
            color={isFollowing ? 'outline' : color}
            label={isFollowing ? (isHovered ? 'Unfollow' : 'Following') : 'Follow'}
            size={size}
            onClick={(event) => {
                event?.preventDefault();
                event?.stopPropagation();
                handleClick();
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        />
    );
};

export default FollowButton;
