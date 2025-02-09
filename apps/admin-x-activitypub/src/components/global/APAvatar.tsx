import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import ViewProfileModal from '../modals/ViewProfileModal';
import clsx from 'clsx';
import getUsername from '../../utils/get-username';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Icon} from '@tryghost/admin-x-design-system';

type AvatarSize = '2xs' | 'xs' | 'sm' | 'lg' | 'notification';

interface APAvatarProps {
    author: {
        icon: {
            url: string;
        };
        name: string;
        handle?: string;
    } | undefined;
    size?: AvatarSize;
}

const APAvatar: React.FC<APAvatarProps> = ({author, size}) => {
    let iconSize = 18;
    let containerClass = `shrink-0 items-center justify-center overflow-hidden relative z-10 flex ${size === 'lg' ? '' : 'hover:opacity-80 cursor-pointer'}`;
    let imageClass = 'z-10 object-cover';
    const [iconUrl, setIconUrl] = useState(author?.icon?.url);

    useEffect(() => {
        setIconUrl(author?.icon?.url);
    }, [author?.icon?.url]);

    if (!author) {
        return null;
    }

    switch (size) {
    case '2xs':
        iconSize = 10;
        containerClass = clsx('h-4 w-4 rounded-md', containerClass);
        imageClass = clsx('h-4 w-4', imageClass);
        break;
    case 'xs':
        iconSize = 12;
        containerClass = clsx('h-6 w-6 rounded-lg', containerClass);
        imageClass = clsx('h-6 w-6', imageClass);
        break;
    case 'notification':
        iconSize = 12;
        containerClass = clsx('h-9 w-9 rounded-lg', containerClass);
        imageClass = clsx('h-9 w-9', imageClass);
        break;
    case 'sm':
        containerClass = clsx('h-10 w-10 rounded-xl', containerClass);
        imageClass = clsx('h-10 w-10', imageClass);
        break;
    case 'lg':
        containerClass = clsx('h-22 w-22 rounded-xl', containerClass);
        imageClass = clsx('h-22 w-22', imageClass);
        break;
    default:
        containerClass = clsx('h-10 w-10 rounded-lg', containerClass);
        imageClass = clsx('h-10 w-10', imageClass);
        break;
    }

    if (!iconUrl) {
        containerClass = clsx(containerClass, 'bg-grey-100');
    }

    const handle = author?.handle || getUsername(author as ActorProperties);

    const onClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        NiceModal.show(ViewProfileModal, {handle});
    };

    const title = `${author?.name} ${handle}`;

    if (iconUrl) {
        return (
            <div
                className={containerClass}
                title={title}
                onClick={size === 'lg' ? undefined : onClick}
            >
                <img
                    className={imageClass}
                    src={iconUrl}
                    onError={() => setIconUrl(undefined)}
                />
            </div>
        );
    }

    return (
        <div
            className={containerClass}
            title={title}
            onClick={onClick}
        >
            <Icon
                colorClass='text-grey-600'
                name='user'
                size={iconSize}
            />
        </div>
    );
};

export default APAvatar;
