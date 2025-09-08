import React from 'react';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Skeleton} from '@tryghost/shade';
import {useNavigate} from '@tryghost/admin-x-framework';

import APAvatar from '../../global/APAvatar';
import getUsername from '../../../utils/get-username';
import {handleProfileClick} from '../../../utils/handle-profile-click';
import {renderTimestamp} from '../../../utils/render-timestamp';

interface FeedItemHeaderProps {
    author: ActorProperties;
    object: ObjectProperties;
    isLoading?: boolean;
    isPending?: boolean;
    isCompact?: boolean;
    isAuthorCurrentUser?: boolean;
    followedByMe?: boolean;
    showAvatar?: boolean;
    avatarSize?: '2xs' | 'xs' | 'sm' | 'md';
    className?: string;
}

const FeedItemHeader: React.FC<FeedItemHeaderProps> = ({
    author,
    object,
    isLoading = false,
    isPending = false,
    isCompact = false,
    isAuthorCurrentUser = false,
    followedByMe = false,
    showAvatar = true,
    avatarSize,
    className = ''
}) => {
    const navigate = useNavigate();

    return (
        <div className={`flex min-w-0 grow items-center gap-3 ${className}`}>
            {showAvatar && (
                <APAvatar
                    author={author}
                    disabled={isPending}
                    showFollowButton={!isAuthorCurrentUser && !followedByMe}
                    size={avatarSize}
                />
            )}
            <div className='flex min-w-0 grow flex-col' onClick={(e) => {
                if (!isPending) {
                    handleProfileClick(author, navigate, e);
                }
            }}>
                <span className={`min-w-0 truncate font-semibold break-anywhere ${isCompact ? 'text-lg' : 'text-md'} ${!isPending ? 'hover-underline' : ''} dark:text-white`}
                    data-test-activity-heading
                >
                    {!isLoading ? author.name : <Skeleton className='w-24' />}
                </span>
                <div className={`flex w-full ${isCompact ? 'text-md' : 'text-sm'} text-gray-700 dark:text-gray-600`}>
                    <span className={`truncate ${!isPending ? 'hover-underline' : ''}`}>
                        {!isLoading ? getUsername(author) : <Skeleton className='w-56' />}
                    </span>
                    <div className={`ml-1 before:mr-1 ${!isLoading && 'before:content-["·"]'}`}>
                        {!isLoading ? renderTimestamp(object, (isPending === false && !object.authored)) : <Skeleton className='w-4' />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeedItemHeader;
