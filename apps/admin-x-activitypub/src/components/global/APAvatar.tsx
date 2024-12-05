import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import getUsername from '../../utils/get-username';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Icon} from '@tryghost/admin-x-design-system';

type AvatarSize = '2xs' | 'xs' | 'sm' | 'lg';
export type AvatarBadge = 'user-fill' | 'heart-fill' | 'comment-fill' | undefined;

interface APAvatarProps {
    author?: ActorProperties;
    size?: AvatarSize;
    badge?: AvatarBadge;
}

const APAvatar: React.FC<APAvatarProps> = ({author, size, badge}) => {
    let iconSize = 18;
    let containerClass = 'shrink-0 items-center justify-center relative z-10 flex';
    let imageClass = 'z-10 rounded-md w-10 h-10 object-cover';
    const badgeClass = `w-6 h-6 z-20 rounded-full absolute -bottom-2 -right-[0.6rem] border-2 border-white content-box flex items-center justify-center`;
    let badgeColor = '';
    const [iconUrl, setIconUrl] = useState(author?.icon?.url);

    useEffect(() => {
        setIconUrl(author?.icon?.url);
    }, [author?.icon?.url]);

    switch (badge) {
    case 'user-fill':
        badgeColor = 'bg-blue-500';
        break;
    case 'heart-fill':
        badgeColor = 'bg-red-500';
        break;
    case 'comment-fill':
        badgeColor = 'bg-purple-500';
        break;
    }

    switch (size) {
    case '2xs':
        iconSize = 10;
        containerClass = clsx('h-4 w-4 rounded-md ', containerClass);
        imageClass = 'z-10 rounded-md w-4 h-4 object-cover';
        break;
    case 'xs':
        iconSize = 12;
        containerClass = clsx('h-6 w-6 rounded-md ', containerClass);
        imageClass = 'z-10 rounded-md w-6 h-6 object-cover';
        break;
    case 'sm':
        containerClass = clsx('h-10 w-10 rounded-md', containerClass);
        break;
    case 'lg':
        containerClass = clsx('h-22 w-22 rounded-xl', containerClass);
        imageClass = 'z-10 rounded-xl w-22 h-22 object-cover';
        break;
    default:
        containerClass = clsx('h-10 w-10 rounded-md', containerClass);
        break;
    }

    if (!iconUrl) {
        containerClass = clsx(containerClass, 'bg-grey-100');
    }

    const BadgeElement = badge && (
        <div className={clsx(badgeClass, badgeColor)}>
            <Icon
                colorClass='text-white'
                name={badge}
                size='xs'
            />
        </div>
    );

    if (iconUrl) {
        return (
            <a className={containerClass} href={author?.url} rel='noopener noreferrer' target='_blank' title={`${author?.name} ${getUsername(author as ActorProperties)}`}>
                <img
                    className={imageClass}
                    src={iconUrl}
                    onError={() => setIconUrl(undefined)}
                />
                {BadgeElement}
            </a>
        );
    }

    return (
        <div className={containerClass} title={author?.name}>
            <Icon
                colorClass='text-grey-600'
                name='user'
                size={iconSize}
            />
            {BadgeElement}
        </div>
    );
};

export default APAvatar;
