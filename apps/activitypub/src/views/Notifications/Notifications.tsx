import React, {useEffect, useRef} from 'react';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, LoadingIndicator, LucideIcon, Skeleton} from '@tryghost/shade';

import APAvatar from '@components/global/APAvatar';
import Error from '@components/layout/Error';
import FeedItemStats from '@components/feed/FeedItemStats';
import Layout from '@components/layout';
import NotificationIcon from './components/NotificationIcon';
import NotificationItem from './components/NotificationItem';
import ProfilePreviewHoverCard from '@components/global/ProfilePreviewHoverCard';
import Separator from '@components/global/Separator';
import {EmptyViewIcon, EmptyViewIndicator} from '@src/components/global/EmptyViewIndicator';
import {Notification, isApiError} from '@src/api/activitypub';
import {handleProfileClick} from '@utils/handle-profile-click';
import {renderFeedAttachment} from '@components/feed/FeedItem';
import {renderTimestamp} from '@src/utils/render-timestamp';
import {stripHtml} from '@src/utils/content-formatters';
import {useNavigateWithBasePath} from '@src/hooks/use-navigate-with-base-path';
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

/**
 * Calculate a time bucket for grouping notifications
 * Groups notifications into time windows
 */
function getTimeBucket(timestamp: string): string {
    const TIME_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
    const date = new Date(timestamp);
    const timeMs = date.getTime();
    const bucketStart = Math.floor(timeMs / TIME_WINDOW_MS) * TIME_WINDOW_MS;
    return bucketStart.toString();
}

function groupNotifications(notifications: Notification[]): NotificationGroup[] {
    const groups: {
        [key: string]: NotificationGroup
    } = {};

    let lastType: string | null = null;
    let sequenceCounter = 0;

    notifications.forEach((notification) => {
        // Increment sequence counter when we encounter a different type
        // This preserves chronological order by preventing grouping across type boundaries
        if (notification.type !== lastType) {
            sequenceCounter += 1;
            lastType = notification.type;
        }

        let groupKey = '';
        const timeBucket = `_${getTimeBucket(notification.createdAt)}`;
        const sequence = `_seq${sequenceCounter}`;

        switch (notification.type) {
        case 'like':
            if (notification.post?.id) {
                groupKey = `like_${notification.post.id}${timeBucket}${sequence}`;
            }
            break;
        case 'reply':
            // Don't group replies
            groupKey = `reply_${notification.id}`;
            break;
        case 'repost':
            if (notification.post?.id) {
                groupKey = `repost_${notification.post.id}${timeBucket}${sequence}`;
            }
            break;
        case 'follow':
            groupKey = `follow_${timeBucket}${sequence}`;
            break;
        case 'mention':
            // Don't group mentions
            groupKey = `mention_${notification.id}`;
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

    const navigate = useNavigateWithBasePath();

    const actorText = (
        <>
            <ProfilePreviewHoverCard actor={firstActor as unknown as ActorProperties} isCurrentUser={false}>
                <span
                    className={actorClass}
                    onClick={(e) => {
                        e?.stopPropagation();
                        handleProfileClick(firstActor.handle, navigate);
                    }}
                >
                    {firstActor.name}
                </span>
            </ProfilePreviewHoverCard>
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
            return actorText;
        }
        break;
    case 'mention':
        return actorText;
    }

    return <></>;
};

const ProfileLinkedContent: React.FC<{
    content: string;
    className?: string;
    stripTags?: string[];
}> = ({content, className, stripTags = []}) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigateWithBasePath();

    useEffect(() => {
        const element = contentRef.current;
        if (!element) {
            return;
        }

        const handleProfileLinkClick = (e: Event) => {
            const target = (e as MouseEvent).target as HTMLElement;
            const link = target.closest('a[data-profile]');

            if (link) {
                const handle = link.getAttribute('data-profile')?.trim();
                const isValidHandle = /^@([\w.-]+)@([\w-]+\.[\w.-]+[a-zA-Z])$/.test(handle || '');

                if (isValidHandle && handle) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleProfileClick(handle, navigate);
                }
            }
        };

        element.addEventListener('click', handleProfileLinkClick);
        return () => {
            element.removeEventListener('click', handleProfileLinkClick);
        };
    }, [navigate, content]);

    return (
        <div
            dangerouslySetInnerHTML={{__html: stripHtml(content || '', stripTags)}}
            ref={contentRef}
            className={className}
        />
    );
};

const Notifications: React.FC = () => {
    const [openStates, setOpenStates] = React.useState<{[key: string]: boolean}>({});
    const navigate = useNavigateWithBasePath();

    const toggleOpen = (groupId: string) => {
        setOpenStates(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const handleLikeClick = () => {
        // Do API req or smth
        // Don't need to know about setting timeouts or anything like that
    };

    const maxAvatars = 5;

    const {data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useNotificationsForUser('index');

    const notificationGroups = (
        data?.pages.flatMap((page) => {
            return groupNotifications(page.notifications);
        })
        // If no notifications, return 10 empty groups for the loading state
        ?? Array(10).fill({actors: [{}]}));

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
                navigate(`/${group.post.type === 'article' ? 'reader' : 'notes'}/${encodeURIComponent(group.post.id)}`);
            }
            break;
        case 'reply':
            if (group.post && group.inReplyTo) {
                navigate(`/notes/${encodeURIComponent(group.post.id)}`);
            }
            break;
        case 'repost':
            if (group.post) {
                navigate(`/${group.post.type === 'article' ? 'reader' : 'notes'}/${encodeURIComponent(group.post.id)}`);
            }
            break;
        case 'follow':
            if (group.actors.length > 1) {
                toggleOpen(group.id || `${group.type}_${index}`);
            } else {
                handleProfileClick(group.actors[0].handle, navigate);
            }
            break;
        case 'mention':
            if (group.post) {
                navigate(`/notes/${encodeURIComponent(group.post.id)}`);
            }
            break;
        }
    };

    if (error && isApiError(error)) {
        return <Error errorCode={error.code} statusCode={error.statusCode}/>;
    }

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
                            <div className='my-8 flex w-full max-w-[620px] flex-col max-md:mt-5'>
                                {notificationGroups.map((group, index) => (
                                    <React.Fragment key={group.id || `${group.type}_${index}`}>
                                        <NotificationItem
                                            centerAlign={group.actors.length < 2 && group.type === 'follow'}
                                            className='hover:bg-gray-75 dark:hover:bg-gray-950'
                                            isGrouped={group.actors.length > 1}
                                            onClick={() => handleNotificationClick(group, index)}
                                        >
                                            {isLoading ?
                                                <Skeleton className='rounded-full' containerClassName='flex h-10 w-10' /> :
                                                (group.actors.length > 1 ?
                                                    <NotificationItem.Icon type={group.type} /> :
                                                    <div className='relative'>
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
                                                            <div className='absolute right-[28px] z-10 flex size-9 items-center justify-center rounded-full bg-black/50 text-base font-semibold tracking-tightest text-white'>
                                                                {`+${group.actors.length - maxAvatars}`}
                                                            </div>
                                                        )}

                                                        {group.actors.length > 1 && (
                                                            <Button className={`group flex items-center gap-0.5 text-gray-700 hover:bg-transparent hover:text-black dark:text-gray-600 dark:hover:text-white ${openStates[group.id || `${group.type}_${index}`] ? 'ml-[-20px]' : 'ml-0 w-[28px]'}`} variant='ghost' onClick={(event?: React.MouseEvent<HTMLElement>) => {
                                                                event?.stopPropagation();
                                                                toggleOpen(group.id || `${group.type}_${index}`);
                                                            }}>
                                                                <LucideIcon.ChevronDown className={`${openStates[group.id || `${group.type}_${index}`] ? 'rotate-180' : ''}`} size={20} strokeWidth={1.5} />
                                                                {openStates[group.id || `${group.type}_${index}`] ? 'Hide' : <span className='sr-only'>Show all</span>}
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out  ${openStates[group.id || `${group.type}_${index}`] ? 'mb-2 max-h-[1384px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                                        {openStates[group.id || `${group.type}_${index}`] && group.actors.length > 1 && (
                                                            <div className='flex flex-col gap-2 pt-2'>
                                                                {group.actors.map((actor: ActorProperties) => (
                                                                    <div
                                                                        key={actor.id}
                                                                        className='flex items-center break-anywhere hover:opacity-80'
                                                                        onClick={(e) => {
                                                                            e?.stopPropagation();
                                                                            handleProfileClick(actor.handle, navigate);
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
                                                <div>
                                                    {isLoading ?
                                                        <>
                                                            <Skeleton />
                                                            <Skeleton className='w-full max-w-60' />
                                                        </> :
                                                        <div className='flex items-center gap-1'>
                                                            <span className='truncate'><NotificationGroupDescription group={group} /></span>
                                                            {group.actors.length < 2 &&
                                                                <>
                                                                    <span className='mt-px text-[8px] text-gray-700 dark:text-gray-600'>&bull;</span>
                                                                    <span className='mt-0.5 text-sm text-gray-700 dark:text-gray-600'>{renderTimestamp(group, false)}</span>
                                                                </>
                                                            }
                                                        </div>
                                                    }
                                                </div>
                                                {(
                                                    ((group.type === 'reply' && group.inReplyTo) || group.type === 'mention') ||
                                                    (group.type === 'like' && !group.post?.name && group.post?.content) ||
                                                    (group.type === 'repost' && !group.post?.name && group.post?.content)
                                                ) && (
                                                    (group.type !== 'reply' && group.type !== 'mention' ?
                                                        <div className='ap-note-content mt-0.5 line-clamp-1 text-pretty text-sm text-gray-700 dark:text-gray-600'>
                                                            {group.post?.type === 'article' && group.post?.title && <>{group.post.title} &mdash; </>}
                                                            <span dangerouslySetInnerHTML={{__html: stripHtml(group.post?.content || '')}} />
                                                        </div> :
                                                        <>
                                                            <div className='mt-2.5 rounded-md bg-gray-100 px-5 py-[14px] group-hover:bg-gray-200 dark:bg-gray-925/30 group-hover:dark:bg-black/40'>
                                                                <ProfileLinkedContent
                                                                    className='ap-note-content text-pretty'
                                                                    content={group.post?.content || ''}
                                                                    stripTags={['a']}
                                                                />
                                                                {group.post && group.post.attachments && group.post.attachments.length > 0 && (
                                                                    <div className='notification-attachments mb-1 [&_.attachment-gallery]:flex [&_.attachment-gallery]:flex-wrap [&_img]:aspect-square [&_img]:max-w-[calc(20%-6.4px)]'>
                                                                        {renderFeedAttachment(
                                                                            {...group.post, type: 'Note', attachment: group.post.attachments}
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    )
                                                )}
                                                {((group.type === 'reply' && group.post) || group.type === 'mention') && (
                                                    <div className="mt-1.5">
                                                        <FeedItemStats
                                                            actor={{
                                                                ...group.actors[0],
                                                                icon: {
                                                                    url: group.actors[0].avatarUrl || ''
                                                                },
                                                                id: group.actors[0].url,
                                                                preferredUsername: group.actors[0].handle?.replace(/^@([^@]+)@.*$/, '$1') || 'unknown'
                                                            }}
                                                            buttonClassName='hover:bg-gray-200'
                                                            commentCount={group.post.replyCount || 0}
                                                            layout="notification"
                                                            likeCount={group.post.likeCount || 0}
                                                            object={{
                                                                ...group.post,
                                                                liked: group.post.likedByMe,
                                                                reposted: group.post.repostedByMe
                                                            }}
                                                            repostCount={group.post.repostCount || 0}
                                                            onLikeClick={handleLikeClick}
                                                        />
                                                    </div>
                                                )}
                                            </NotificationItem.Content>
                                        </NotificationItem>
                                        {index < notificationGroups.length - 1 &&
                                            <div className='pl-[52px]'><Separator /></div>
                                        }
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
