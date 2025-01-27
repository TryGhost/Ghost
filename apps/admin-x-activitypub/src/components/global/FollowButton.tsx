import NiceModal from '@ebay/nice-modal-react';
import clsx from 'clsx';
import {Button, Modal} from '@tryghost/admin-x-design-system';
import {useEffect, useState} from 'react';
import {useFollow} from '../../hooks/useActivityPubQueries';

interface FollowButtonProps {
    className?: string;
    following: boolean;
    color?: 'black' | 'grey' | 'outline';
    size?: 'sm' | 'md';
    handle: string;
    type?: 'button' | 'link';
    onFollow?: () => void;
    onUnfollow?: () => void;
}

const UnfollowModal = NiceModal.create(({onUnfollow}: {onUnfollow: () => void}) => {
    const modal = NiceModal.useModal();

    return (
        <Modal
            cancelLabel="Cancel"
            okLabel="Unfollow"
            size="sm"
            onCancel={() => modal.remove()}
            onOk={() => {
                onUnfollow();
                modal.remove();
            }}
        >
            <p>Are you sure you want to unfollow this account?</p>
        </Modal>
    );
});

const noop = () => {};

const FollowButton: React.FC<FollowButtonProps> = ({
    className,
    color = 'black',
    following,
    handle,
    size = 'md',
    type = 'button',
    onFollow = noop,
    onUnfollow = noop
}) => {
    const [isFollowing, setIsFollowing] = useState(following);
    const [isHovered, setIsHovered] = useState(false);

    const mutation = useFollow('index',
        noop,
        () => {
            setIsFollowing(false);
            onUnfollow();
        }
    );

    const handleClick = async () => {
        if (isFollowing) {
            NiceModal.show(UnfollowModal, {
                onUnfollow: () => {
                    setIsFollowing(false);
                    onUnfollow();
                    // @TODO: Implement unfollow mutation
                }
            });
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
            className={clsx(
                className,
                (type !== 'link') && 'min-w-[96px]',
                (type === 'link' && isFollowing) && 'opacity-50'
            )}
            color={isFollowing ? 'outline' : color}
            label={isFollowing ? (isHovered ? 'Unfollow' : 'Following') : 'Follow'}
            link={type === 'link'}
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
