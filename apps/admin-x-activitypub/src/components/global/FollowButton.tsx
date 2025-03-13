import clsx from 'clsx';
import {Button} from '@tryghost/shade';
import {useEffect, useState} from 'react';
import {useFollowMutationForUser, useUnfollowMutationForUser} from '@hooks/use-activity-pub-queries';

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
    onFollow = noop,
    onUnfollow = noop
}) => {
    const [isFollowing, setIsFollowing] = useState(following);

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

    return (
        <Button
            className={clsx(
                'min-w-[90px]',
                className
            )}
            title={isFollowing ? 'Click to unfollow' : ''}
            variant={!isFollowing ? 'default' : 'outline'}
            onClick={(event) => {
                event?.preventDefault();
                event?.stopPropagation();
                handleClick();
            }}
        >
            {isFollowing ? 'Following' : 'Follow'}
        </Button>
    );
};

export default FollowButton;
