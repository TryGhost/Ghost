import clsx from 'clsx';
import {Button} from '@tryghost/shade';
import {useEffect, useState} from 'react';
import {useFollowMutationForUser, useUnfollowMutationForUser} from '../../hooks/useActivityPubQueries';

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

    const unfollowMutation = useUnfollowMutationForUser('index',
        noop,
        () => {
            setIsFollowing(false);
            onUnfollow();
        }
    );

    const followMutation = useFollowMutationForUser('index',
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

    const variant = (isFollowing ? 'outline' : (type === 'primary') ? 'default' : 'secondary');
    const size = (type === 'primary') ? 'default' : 'sm';
    const minWidth = (type === 'primary') ? 'min-w-[83.67px]' : 'min-w-[81.15px]';

    return (
        <Button
            className={clsx(
                className,
                isFollowing && minWidth
            )}
            size={size}
            variant={variant}
            onClick={(event) => {
                event?.preventDefault();
                event?.stopPropagation();
                handleClick();
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {isFollowing ? (isHovered ? 'Unfollow' : 'Following') : 'Follow'}
        </Button>
    );
};

export default FollowButton;
