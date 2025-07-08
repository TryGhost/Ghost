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
    'data-testid'?: string;
}

const noop = () => {};

const FollowButton: React.FC<FollowButtonProps> = ({
    className,
    following,
    handle,
    onFollow = noop,
    onUnfollow = noop,
    'data-testid': testId
}) => {
    const [isFollowing, setIsFollowing] = useState(following);

    const unfollowMutation = useUnfollowMutationForUser('index',
        () => {
            // Success handled by cache updates
        },
        () => {
            setIsFollowing(true);
        }
    );

    const followMutation = useFollowMutationForUser('index',
        () => {
            // Success handled by cache updates
        },
        () => {
            setIsFollowing(false);
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
            data-testid={testId}
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
