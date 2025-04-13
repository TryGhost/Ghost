import React, {useEffect, useRef} from 'react';
import {LucideIcon, Skeleton} from '@tryghost/shade';

import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, LoadingIndicator} from '@tryghost/admin-x-design-system';

import APAvatar from '@components/global/APAvatar';
import NotificationItem from '@components/activities/NotificationItem';
import Separator from '@components/global/Separator';

import Layout from '@components/layout';
import truncate from '@utils/truncate';
import {EmptyViewIcon, EmptyViewIndicator} from '@src/components/global/EmptyViewIndicator';
import {Notification} from '@src/api/activitypub';
import {handleProfileClickRR} from '@utils/handle-profile-click';
import {stripHtml} from '@src/utils/content-formatters';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useNotificationsForUser} from '@hooks/use-activity-pub-queries';

interface NotificationGroup {
    id: string;
    type: Notification['type'];
    actors: Notification['actor'][];
    post: Notification['post'];
    inReplyTo: Notification['inReplyTo'];
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
                inReplyTo: notification.inReplyTo
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
    const [firstActor, secondActor, ...otherActors] = group.actors;
    const hasOthers = otherActors.length > 0;

    const actorClass = 'cursor-pointer font-semibold hover:underline';

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
            {secondActor && (
                <>
                    {hasOthers ? ', ' : ' and '}
                    <span
                        className={actorClass}
                        onClick={(e) => {
                            e?.stopPropagation();
                            handleProfileClickRR(secondActor.handle, navigate);
                        }}
                    >
                        {secondActor.name}
                    </span>
                </>
            )}
            {hasOthers && ' and others'}
        </>
    );

    switch (group.type) {
    case 'follow':
        return <>{actorText} started following you</>;
    case 'like':
        return <>{actorText} liked your {group.post?.type === 'article' ? 'post' : 'note'} <span className='font-semibold'>{group.post?.title || ''}</span></>;
    case 'repost':
        return <>{actorText} reposted your {group.post?.type === 'article' ? 'post' : 'note'} <span className='font-semibold'>{group.post?.title || ''}</span></>;
    case 'reply':
        if (group.inReplyTo && typeof group.inReplyTo !== 'string') {
            let content = stripHtml(group.inReplyTo.content || '');

            // If the post has a title, use that instead of the content (notes do not have a title)
            if (group.inReplyTo.title) {
                content = stripHtml(group.inReplyTo.title);
            }

            return <>{actorText} replied to your {group.post?.type === 'article' ? 'post' : 'note'} <span className='font-semibold'>{truncate(content, 80)}</span></>;
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
                navigate(`/${group.inReplyTo.type === 'article' ? 'inbox' : 'feed'}/${encodeURIComponent(group.post.id)}`);
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
                                            onClick={() => handleNotificationClick(group, index)}
                                        >
                                            {isLoading ?
                                                <Skeleton className='rounded-full' containerClassName='flex h-10 w-10' /> :
                                                <NotificationItem.Icon type={group.type} />
                                            }
                                            <NotificationItem.Avatars>
                                                <div className='flex flex-col'>
                                                    <div className='mt-0.5 flex items-center gap-1.5'>
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
                                                                size='notification'
                                                            />
                                                        ))}
                                                        {group.actors.length > maxAvatars && (!openStates[group.id || `${group.type}_${index}`]) && (
                                                            <div
                                                                className='flex h-9 w-5 items-center justify-center text-sm text-gray-700'
                                                            >
                                                                {`+${group.actors.length - maxAvatars}`}
                                                            </div>
                                                        )}

                                                        {group.actors.length > 1 && (
                                                            <Button
                                                                className={`transition-color flex h-9 items-center rounded-full bg-transparent text-gray-700 hover:opacity-60 dark:text-gray-600 ${openStates[group.id || `${group.type}_${index}`] ? 'w-full justify-start pl-1' : '-ml-2 w-9 justify-center'}`}
                                                                hideLabel={!openStates[group.id || `${group.type}_${index}`]}
                                                                icon='chevron-down'
                                                                iconColorClass={`w-[12px] h-[12px] ${openStates[group.id || `${group.type}_${index}`] ? 'rotate-180' : ''}`}
                                                                label={`${openStates[group.id || `${group.type}_${index}`] ? 'Hide' : 'Show all'}`}
                                                                unstyled
                                                                onClick={(event) => {
                                                                    event?.stopPropagation();
                                                                    toggleOpen(group.id || `${group.type}_${index}`);
                                                                }}/>
                                                        )}
                                                    </div>
                                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out  ${openStates[group.id || `${group.type}_${index}`] ? 'mb-2 max-h-[1384px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                                        {openStates[group.id || `${group.type}_${index}`] && group.actors.length > 1 && (
                                                            <div className='flex flex-col gap-2 pt-4'>
                                                                {group.actors.map((actor: ActorProperties) => (
                                                                    <div
                                                                        key={actor.id}
                                                                        className='flex items-center hover:opacity-80'
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
                                                                        <span className='ml-2 text-base font-semibold dark:text-white'>{actor.name}</span>
                                                                        <span className='ml-1 text-base text-gray-700 dark:text-gray-600'>{actor.handle}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </NotificationItem.Avatars>
                                            <NotificationItem.Content>
                                                <div className='line-clamp-2 text-pretty text-black dark:text-white'>
                                                    {isLoading ?
                                                        <>
                                                            <Skeleton />
                                                            <Skeleton className='w-full max-w-60' />
                                                        </> :
                                                        <NotificationGroupDescription group={group} />
                                                    }
                                                </div>
                                                {(
                                                    (group.type === 'reply' && group.inReplyTo) ||
                                                    (group.type === 'like' && !group.post?.name && group.post?.content) ||
                                                    (group.type === 'repost' && !group.post?.name && group.post?.content)
                                                ) && (
                                                    <div
                                                        dangerouslySetInnerHTML={{__html: stripHtml(group.post?.content || '')}}
                                                        className='ap-note-content mt-1 line-clamp-2 text-pretty text-gray-700 dark:text-gray-600'
                                                    />
                                                )}
                                            </NotificationItem.Content>
                                        </NotificationItem>
                                        {index < notificationGroups.length - 1 && <Separator />}
                                    </React.Fragment>
                                ))}
                            </div>
                            <div ref={loadMoreRef} className='h-1'></div>
                            {isFetchingNextPage && (
                                <div className='flex flex-col items-center justify-center space-y-4 text-center'>
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