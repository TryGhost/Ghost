import {Button} from '@tryghost/admin-x-design-system';
import {useEffect, useState} from 'react';
import {useFollow} from '../../hooks/useActivityPubQueries';

interface FollowButtonProps {
    className?: string;
    following: boolean;
    handle: string;
    type?: 'button' | 'link';
    onFollow?: () => void;
    onUnfollow?: () => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({
    className,
    following,
    handle,
    type = 'button',
    onFollow,
    onUnfollow
}) => {
    const [isFollowing, setIsFollowing] = useState(following);
    const [isLoading, setIsLoading] = useState(false);

    const mutation = useFollow(
        'index',
        () => {
            setIsFollowing(true);
            if (onFollow) {
                onFollow();
            }
        },
        () => {
            setIsFollowing(false);
            if (onUnfollow) {
                onUnfollow();
            }
        }
    );

    const handleClick = async () => {
        setIsLoading(true);
        try {
            if (isFollowing) {
                setIsFollowing(false);
                if (onUnfollow) {
                    onUnfollow();
                }

                // @TODO: Implement unfollow mutation
                // await mutation.unfollow(handle); // Uncomment this line after unfollow mutation is implemented
            } else {
                mutation.mutate(handle);
            }
        } catch (error) {
            setIsFollowing(!isFollowing);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setIsFollowing(following);
    }, [following]);

    return (
        <Button
            className={className}
            color="black"
            disabled={isLoading}
            label={isFollowing ? 'Following' : 'Follow'}
            link={type === 'link'}
            onClick={(event: React.MouseEvent) => {
                event.preventDefault();
                event.stopPropagation();
                handleClick();
            }}
        />
    );
};

export default FollowButton;
