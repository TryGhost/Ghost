import clsx from 'clsx';
import {Button} from '@tryghost/shade';
import {useEffect, useState} from 'react';
import {useFollowMutationForUser, useUnfollowMutationForUser} from '@hooks/use-activity-pub-queries';

interface FollowButtonProps {
    className?: string;
    following: boolean;
    handle: string;
    type?: 'primary' | 'secondary';
    variant?: 'default' | 'link';
    onFollow?: () => void;
    onUnfollow?: () => void;
    'data-testid'?: string;
}

const noop = () => {};

const FollowButton: React.FC<FollowButtonProps> = ({
    className,
    following,
    handle,
    variant = 'default',
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

    const buttonText = isFollowing ? 'Following' : 'Follow';

    if (variant === 'link') {
        return (
            <Button
                className={clsx(
                    'p-0 font-medium',
                    isFollowing
                        ? 'text-gray-700 hover:text-black dark:text-gray-600 dark:hover:text-white'
                        : 'text-purple hover:text-black dark:hover:text-white',
                    className
                )}
                data-testid={testId}
                variant="link"
                onClick={(event) => {
                    event?.preventDefault();
                    event?.stopPropagation();
                    handleClick();
                }}
            >
                {buttonText}
            </Button>
        );
    }

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
            {buttonText}
        </Button>
    );
};

export default FollowButton;
