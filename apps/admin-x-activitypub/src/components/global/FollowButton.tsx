import {useState} from 'react';

import {Button} from '@tryghost/admin-x-design-system';

import {useFollow} from '../../hooks/useActivityPubQueries';

interface FollowButtonProps {
    className?: string;
    following: boolean;
    handle: string;
    type?: 'button' | 'link';
}

const FollowButton: React.FC<FollowButtonProps> = ({className, following, handle, type = 'button'}) => {
    const [isFollowing, setIsFollowing] = useState(following);

    const mutation = useFollow('index',
        () => {},
        () => {
            setIsFollowing(false);
        }
    );

    const handleOnClick = async () => {
        if (isFollowing) {
            setIsFollowing(false);

            // @TODO: Implement unfollow
        } else {
            setIsFollowing(true);

            mutation.mutate(handle);
        }
    };

    return (
        <Button
            className={className}
            color='black'
            label={isFollowing ? 'Following' : 'Follow'}
            link={type === 'link'}
            onClick={(event) => {
                event?.preventDefault();
                event?.stopPropagation();

                handleOnClick();
            }}
        />
    );
};

export default FollowButton;
