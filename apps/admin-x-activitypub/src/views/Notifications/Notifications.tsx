import React, {useEffect, useRef} from 'react';
import {LucideIcon, Skeleton} from '@tryghost/shade';

import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {LoadingIndicator} from '@tryghost/admin-x-design-system';

import APAvatar from '@components/global/APAvatar';
import NotificationItem from './components/NotificationItem';
import Separator from '@components/global/Separator';

import Layout from '@components/layout';
import NotificationIcon from './components/NotificationIcon';
import {EmptyViewIcon, EmptyViewIndicator} from '@src/components/global/EmptyViewIndicator';
import {Notification} from '@src/api/activitypub';
import {handleProfileClickRR} from '@utils/handle-profile-click';
import {renderTimestamp} from '@src/utils/render-timestamp';
import {stripHtml} from '@src/utils/content-formatters';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useNotificationsForUser} from '@hooks/use-activity-pub-queries';

interface NotificationGroup {
    id: string;
    type: Notification['type'];
    actors: Notification['actor'][];
    post: Notification['post'];
    inReplyTo: Notification['inReplyTo'];
    createdAt: string;
}

interface NotificationGroupDescriptionProps {
    group: NotificationGroup;
}

function groupNotifications(notifications: Notification[]): NotificationGroup[] {
    const groups: {
        [key: string]: NotificationGroup
    } = {};

    notifications.forEach((notification) => {
        let groupKey = '';

        switch (notification.type) {
        case 'like':
            if (notification.post?.id) {
                // Group likes by the target object
                groupKey = `like_${notification.post.id}`;
            }
            break;
        case 'reply':
            // Don't group replies
            groupKey = `reply_${notification.id}`;
            break;
        case 'repost':
            if (notification.post?.id) {
                // Group reposts by the target object
                groupKey = `repost_${notification.post.id}`;
            }
            break;
        case 'follow':
            // Group follows that are next to each other in the array
            groupKey = `follow_${notification.type}`;
            break;
        }

        if (!groups[groupKey]) {
            groups[groupKey] = {
                id: notification.id,
                type: notification.type,
                actors: [],
                post: notification.post,
                inReplyTo: notification.inReplyTo,
                createdAt: notification.createdAt
            };
        }

        // Add actor if not already in the group
        if (!groups[groupKey].actors.find(a => a.id === notification.actor.id)) {
            groups[groupKey].actors.push(notification.actor);
        }
    });

    return Object.values(groups);
};

const NotificationGroupDescription: React.FC<NotificationGroupDescriptionProps> = ({group}) => {
    const [firstActor, ...otherActors] = group.actors;
    const hasOthers = otherActors.length > 0;

    const actorClass = 'cursor-pointer font-semibold hover:underline text-black dark:text-white';

    const navigate = useNavigate();

    const actorText = (
        <>
            <span
                className={actorClass}
                onClick={(e) => {
                    e?.stopPropagation();
                    handleProfileClickRR(firstActor.handle, navigate);
                }}
            >
                {firstActor.name}
            </span>
            {hasOthers && ` and ${otherActors.length} ${otherActors.length > 1 ? 'others' : 'other'}`}
        </>
    );

    switch (group.type) {
    case 'follow':
        return <>{actorText} followed you</>;
    case 'like':
        return <>{actorText} liked your {group.post?.type === 'article' ? 'post' : 'note'}</>;
    case 'repost':
        return <>{actorText} reposted your {group.post?.type === 'article' ? 'post' : 'note'}</>;
    case 'reply':
        if (group.inReplyTo && typeof group.inReplyTo !== 'string') {
            return <>{actorText} replied to your {group.inReplyTo?.type === 'article' ? 'post' : 'note'}</>;
        }
    }

    return <></>;
};

const Notifications: React.FC = () => {
    const [openStates, setOpenStates] = React.useState<{[key: string]: boolean}>({});
    const navigate = useNavigate();

    const toggleOpen = (groupId: string) => {
        setOpenStates(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const maxAvatars = 5;

    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useNotificationsForUser('index');

    const notificationGroups = (
        data?.pages.flatMap((page) => {
            return groupNotifications(page.notifications);
        })
        // If no notifications, return 5 empty groups for the loading state
        ?? Array(5).fill({actors: [{}]}));

    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        observerRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        });

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const handleNotificationClick = (group: NotificationGroup, index: number) => {
        switch (group.type) {
        case 'like':
            if (group.post) {
                navigate(`/${group.post.type === 'article' ? 'inbox' : 'feed'}/${encodeURIComponent(group.post.id)}`);
            }
            break;
        case 'reply':
            if (group.post && group.inReplyTo) {
                navigate(`/feed/${encodeURIComponent(group.post.id)}`);
            }
            break;
        case 'repost':
            if (group.post) {
                navigate(`/${group.post.type === 'article' ? 'inbox' : 'feed'}/${encodeURIComponent(group.post.id)}`);
            }
            break;
        case 'follow':
            if (group.actors.length > 1) {
                toggleOpen(group.id || `${group.type}_${index}`);
            } else {
                handleProfileClickRR(group.actors[0].handle, navigate);
            }
            break;
        }
    };

    return (
        <Layout>
            <div className='z-0 flex w-full flex-col items-center'>
                {
                    isLoading === false && notificationGroups.length === 0 && (
                        <EmptyViewIndicator>
                            <EmptyViewIcon><LucideIcon.Bell /></EmptyViewIcon>
                            Quiet for now, but not for long! When someone likes, boosts, or replies to you, you&apos;ll find it here.
                        </EmptyViewIndicator>
                    )
                }
                {
                    (notificationGroups.length > 0) && (
                        <>
                            <div className='my-8 flex w-full max-w-[620px] flex-col'>
                                {notificationGroups.map((group, index) => (
                                    <React.Fragment key={group.id || `${group.type}_${index}`}>
                                        <NotificationItem
                                            className='hover:bg-gray-75 dark:hover:bg-gray-950'
                                            isGrouped={group.actors.length > 1}
                                            onClick={() => handleNotificationClick(group, index)}
                                        >
                                            {isLoading ?
                                                <Skeleton className='rounded-full' containerClassName='flex h-10 w-10' /> :
                                                (group.actors.length > 1 ?
                                                    <NotificationItem.Icon type={group.type} /> :
                                                    <div className='relative mt-0.5'>
                                                        <APAvatar
                                                            key={group.actors[0].id}
                                                            author={{
                                                                icon: {
                                                                    url: group.actors[0].avatarUrl || ''
                                                                },
                                                                name: group.actors[0].name,
                                                                handle: group.actors[0].handle
                                                            }}
                                                            size='notification'
                                                        />
                                                        <NotificationIcon className='absolute -bottom-1 -right-1 z-10 border-2 border-white dark:border-black' notificationType={group.type} size='sm' />
                                                    </div>
                                                )
                                            }
                                            {group.actors.length > 1 && <NotificationItem.Avatars>
                                                <div className='flex flex-col'>
                                                    <div className='relative flex items-center pl-2'>
                                                        {!openStates[group.id || `${group.type}_${index}`] && group.actors.slice(0, maxAvatars).map((actor: ActorProperties) => (
                                                            <APAvatar
                                                                key={actor.id}
                                                                author={{
                                                                    icon: {
                                                                        url: actor.avatarUrl || ''
                                                                    },
                                                                    name: actor.name,
                                                                    handle: actor.handle
                                                                }}
                                                                className='-ml-2 !bg-[#F3F3F3] outline outline-2 outline-white group-hover:!bg-[#EDEEF0] group-hover:outline-gray-75 dark:outline-black group-hover:dark:outline-gray-950'
                                                                size='notification'
                                                            />
                                                        ))}
                                                        {group.actors.length > maxAvatars && (!openStates[group.id || `${group.type}_${index}`]) && (
                                                            <div
                                                                className='absolute right-0 z-10 flex size-10 items-center justify-center rounded-full bg-black/50 text-lg font-semibold text-white'
                                                            >
                                                                {`+${group.actors.length - maxAvatars}`}
                                                            </div>
                                                        )}

                                                        {group.actors.length > 1 && (
                                                            <div className='flex items-center gap-0.5 text-gray-700 dark:text-gray-600'>
                                                                <LucideIcon.ChevronDown className={`ml-1.5 text-gray-500 dark:text-gray-400 ${openStates[group.id || `${group.type}_${index}`] ? 'ml-[-10px] rotate-180' : ''}`} size={18} strokeWidth={1.5} />
                                                                {openStates[group.id || `${group.type}_${index}`] ? 'Hide' : <span className='sr-only'>Show all</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out  ${openStates[group.id || `${group.type}_${index}`] ? 'mb-2 max-h-[1384px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                                        {openStates[group.id || `${group.type}_${index}`] && group.actors.length > 1 && (
                                                            <div className='flex flex-col gap-2 pt-4'>
                                                                {group.actors.map((actor: ActorProperties) => (
                                                                    <div
                                                                        key={actor.id}
                                                                        className='flex items-center break-anywhere hover:opacity-80'
                                                                        onClick={(e) => {
                                                                            e?.stopPropagation();
                                                                            handleProfileClickRR(actor.handle, navigate);
                                                                        }}
                                                                    >
                                                                        <APAvatar author={{
                                                                            icon: {
                                                                                url: actor.avatarUrl || ''
                                                                            },
                                                                            name: actor.name,
                                                                            handle: actor.handle
                                                                        }} size='xs' />
                                                                        <span className='ml-2 line-clamp-1 text-base font-semibold dark:text-white'>{actor.name}</span>
                                                                        <span className='ml-1 line-clamp-1 text-base text-gray-700 dark:text-gray-600'>{actor.handle}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </NotificationItem.Avatars>}
                                            <NotificationItem.Content>
                                                <div className='text-gray-700 dark:text-gray-600'>
                                                    {isLoading ?
                                                        <>
                                                            <Skeleton />
                                                            <Skeleton className='w-full max-w-60' />
                                                        </> :
                                                        <div className='flex items-center gap-1'>
                                                            <span><NotificationGroupDescription group={group} /></span>
                                                            <span className='mt-px text-[8px]'>&bull;</span>
                                                            <span className='mt-0.5 text-sm'>{renderTimestamp(group, false)}</span>
                                                        </div>
                                                    }
                                                </div>
                                                {(
                                                    (group.type === 'reply' && group.inReplyTo) ||
                                                    (group.type === 'like' && !group.post?.name && group.post?.content) ||
                                                    (group.type === 'repost' && !group.post?.name && group.post?.content)
                                                ) && (
                                                    (group.post?.type === 'note' ?
                                                        <div
                                                            dangerouslySetInnerHTML={{__html: stripHtml(group.post?.content || '')}}
                                                            className='ap-note-content mt-0.5 line-clamp-2 text-pretty text-black dark:text-white'
                                                        /> :
                                                        <div className='mt-4 flex flex-col gap-1 rounded-md border border-gray-150 p-4 text-black dark:border-gray-950 dark:text-white'>
                                                            <span className='-mt-0.5 font-semibold'>{group.post?.title}</span>
                                                            <div
                                                                dangerouslySetInnerHTML={{__html: stripHtml(group.post?.content || '')}}
                                                                className='ap-note-content line-clamp-2 text-pretty'
                                                            />
                                                        </div>
                                                    )
                                                )}
                                            </NotificationItem.Content>
                                        </NotificationItem>
                                        {index < notificationGroups.length - 1 && <div className='pl-14'><Separator /></div>}
                                    </React.Fragment>
                                ))}
                            </div>
                            <div ref={loadMoreRef} className='h-1'></div>
                            {isFetchingNextPage && (
                                <div className='-mt-4 mb-8 flex flex-col items-center justify-center space-y-4 text-center'>
                                    <LoadingIndicator size='md' />
                                </div>
                            )}
                        </>
                    )
                }
            </div>
        </Layout>
    );
};

export default Notifications;
