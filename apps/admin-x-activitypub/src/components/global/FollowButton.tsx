import {useEffect, useState} from 'react';

import {Button, showToast} from '@tryghost/admin-x-design-system';

import {useFollow} from '../../hooks/useActivityPubQueries';

interface FollowButtonProps {
    className?: string;
    isFollowing: boolean;
    toFollow: string;
    type?: 'button' | 'link';
}

const FollowButton: React.FC<FollowButtonProps> = ({className, isFollowing, toFollow, type = 'button'}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [following, setFollowing] = useState(isFollowing); // Add state for following

    const mutation = useFollow('index',
        () => {
            setIsLoading(false);
            setFollowing(true); // Update following state on success

            showToast({
                message: `${toFollow} followed`,
                type: 'success'
            });
        },
        () => {
            setIsLoading(false);

            showToast({
                message: `Failed to follow ${toFollow}`,
                type: 'error'
            });
        }
    );

    // Update following state based on prop change
    useEffect(() => {
        setFollowing(isFollowing);
    }, [isFollowing]);

    const follow = async () => {
        setIsLoading(true);
        mutation.mutate(toFollow);
    };

    return (
        <Button
            className={className}
            color='black'
            disabled={isLoading}
            label={following ? 'Following' : 'Follow'} // Use following state for label
            link={type === 'link'}
            loading={isLoading}
            onClick={(event) => {
                event?.preventDefault();
                event?.stopPropagation();

                follow();
            }}
        />
    );
};

export default FollowButton;
