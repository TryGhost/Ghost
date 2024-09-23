import {useState} from 'react';

import {Button, showToast} from '@tryghost/admin-x-design-system';

import {useFollow} from '../../hooks/useActivityPubQueries';

interface FollowButtonProps {
    className?: string;
    toFollow: string;
    type?: 'button' | 'link';
}

const FollowButton: React.FC<FollowButtonProps> = ({className, toFollow, type = 'button'}) => {
    const [isLoading, setIsLoading] = useState(false);

    const mutation = useFollow('index',
        () => {
            setIsLoading(false);

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

    const follow = async () => {
        setIsLoading(true);

        mutation.mutate(toFollow);
    };

    return (
        <Button
            className={className}
            color='black'
            disabled={isLoading}
            icon='add'
            label='Follow'
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
