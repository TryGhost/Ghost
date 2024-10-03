import {useEffect, useState} from 'react';

import {Button} from '@tryghost/admin-x-design-system';

import {useFollow} from '../../hooks/useActivityPubQueries';

interface FollowButtonProps {
    className?: string;
    following: boolean;
    handle: string;
    type?: 'button' | 'link';
    onFollow?: () => void;
    onUnfollow?: () => void;
}

const noop = () => {};

const FollowButton: React.FC<FollowButtonProps> = ({
    className,
    following,
    handle,
    type = 'button',
    onFollow = noop,
    onUnfollow = noop
}) => {
    const [isFollowing, setIsFollowing] = useState(following);

    const mutation = useFollow('index',
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

            // @TODO: Implement unfollow mutation
        } else {
            setIsFollowing(true);
            onFollow();

            mutation.mutate(handle);
        }
    };

    useEffect(() => {
        setIsFollowing(following);
    }, [following]);

    return (
        <Button
            className={className}
            color='black'
            label={isFollowing ? 'Following' : 'Follow'}
            link={type === 'link'}
            onClick={(event) => {
                event?.preventDefault();
                event?.stopPropagation();

                handleClick();
            }}
        />
    );
};

export default FollowButton;
