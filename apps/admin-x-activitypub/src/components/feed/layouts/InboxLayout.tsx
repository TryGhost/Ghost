import React from 'react';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, H4, LucideIcon, Skeleton} from '@tryghost/shade';

import APAvatar from '../../global/APAvatar';
import FeedItemMenu from '../FeedItemMenu';
import FeedItemStats from '../FeedItemStats';
import getReadingTime from '@utils/get-reading-time';
import getUsername from '@utils/get-username';
import {FeedItemAttachment} from '../common/FeedItemAttachment';
import {handleProfileClick} from '@utils/handle-profile-click';
import {renderTimestamp} from '@utils/render-timestamp';
import {stripHtml} from '@utils/content-formatters';
import {useFeedItemActions} from '@hooks/use-feed-item-actions';
import {useNavigate} from '@tryghost/admin-x-framework';

interface InboxLayoutProps {
    actor: ActorProperties;
    author: ActorProperties;
    allowDelete?: boolean;
    object: ObjectProperties;
    parentId?: string;
    type: string;
    commentCount?: number;
    repostCount?: number;
    likeCount?: number;
    isLoading?: boolean;
    isAuthorCurrentUser?: boolean;
    followedByMe?: boolean;
    onClick?: () => void;
    onDelete?: () => void;
    onLikeClick?: () => void;
    showStats?: boolean;
}

const repostIcon = <LucideIcon.RefreshCw className='shrink-0 text-gray-700 dark:text-gray-600' size={16} strokeWidth={1.5} />;

const InboxLayout: React.FC<InboxLayoutProps> = ({
    actor,
    author,
    allowDelete = false,
    object,
    parentId,
    type,
    commentCount = 0,
    repostCount = 0,
    likeCount = 0,
    isLoading,
    isAuthorCurrentUser = false,
    followedByMe = false,
    onClick,
    onDelete,
    onLikeClick,
    showStats = true
}) => {
    const navigate = useNavigate();

    const {
        actions: {
            handleDelete,
            handleCopyLink,
            handleFollow,
            handleUnfollow
        }
    } = useFeedItemActions({
        author,
        object,
        parentId
    });

    const UserMenuTrigger = (
        <Button className={`relative z-10 size-[34px] rounded-md text-gray-900 hover:text-gray-900 dark:bg-black dark:text-gray-600 dark:hover:bg-gray-950 dark:hover:text-gray-600 [&_svg]:size-5`} data-testid="menu-button" variant='ghost'>
            <LucideIcon.Ellipsis />
        </Button>
    );

    const timestamp = new Date(object?.published ?? new Date()).toLocaleDateString('default', {year: 'numeric', month: 'short', day: '2-digit'}) + ', ' + new Date(object?.published ?? new Date()).toLocaleTimeString('default', {hour: '2-digit', minute: '2-digit'});

    return (
        <div className='group/article relative -mx-4 -my-px flex min-h-[112px] min-w-0 cursor-pointer items-center justify-between rounded-lg p-6 hover:bg-gray-75 dark:hover:bg-gray-950/50' data-layout='inbox' data-object-id={object.id} onClick={onClick}>
            <div className='w-full min-w-0'>
                <div className='z-10 mb-1.5 flex w-full min-w-0 items-center gap-1.5 text-sm group-hover/article:border-transparent'>
                    {!isLoading ?
                        <>
                            <APAvatar author={author} size='2xs' />
                            <span className='min-w-0 truncate font-semibold text-gray-900 break-anywhere hover:underline dark:text-gray-600'
                                title={getUsername(author)}
                                data-test-activity-heading
                                onClick={(e) => {
                                    handleProfileClick(author, navigate, e);
                                }}
                            >{author.name}
                            </span>
                            {(type === 'Announce') && <span className='z-10 flex items-center gap-1 text-gray-700 dark:text-gray-600'>{repostIcon}<span className='line-clamp-1 hover:underline' title={getUsername(actor)} onClick={(e) => {
                                handleProfileClick(actor, navigate, e);
                            }}>{actor.name}</span> reposted</span>}
                            <span className='shrink-0 whitespace-nowrap text-gray-600 before:mr-1 before:content-["·"]' title={`${timestamp}`}>{renderTimestamp(object, !object.authored)}</span>
                        </> :
                        <Skeleton className='w-24' />
                    }
                </div>
                <div className='flex'>
                    <div className='flex min-h-[73px] w-full min-w-0 flex-col items-start justify-start gap-1'>
                        <H4 className='line-clamp-2 w-full max-w-[600px] text-pretty leading-tight break-anywhere' data-test-activity-heading>
                            {isLoading ? <Skeleton className='w-full max-w-96' /> : (object.name ? object.name : (
                                <span dangerouslySetInnerHTML={{
                                    __html: stripHtml(object.content || '')
                                }}></span>
                            ))}
                        </H4>
                        <div className='ap-note-content line-clamp-2 w-full max-w-[600px] text-pretty text-base leading-normal text-gray-800 break-anywhere dark:text-gray-600 [&_p+p]:mt-3'>
                            {!isLoading ?
                                <div dangerouslySetInnerHTML={{
                                    __html: stripHtml(object.preview?.content ?? object.content ?? '')
                                }} />
                                :
                                <Skeleton count={2} />
                            }
                        </div>
                        <span className='mt-1 shrink-0 whitespace-nowrap text-sm leading-none text-gray-600'>
                            {!isLoading ? (object.content && `${getReadingTime(object.content)}`) : <Skeleton className='w-16' />}
                        </span>
                    </div>
                    <div className='invisible absolute right-3 top-8 z-[49] flex -translate-y-1/2 rounded-lg bg-white p-1 shadow-md group-hover/article:visible dark:bg-black'>
                        {showStats && <FeedItemStats
                            actor={author}
                            commentCount={commentCount}
                            layout='inbox'
                            likeCount={likeCount}
                            object={object}
                            repostCount={repostCount}
                            onLikeClick={onLikeClick || (() => {})}
                        />}
                        <FeedItemMenu
                            allowDelete={allowDelete}
                            authoredByMe={isAuthorCurrentUser}
                            followedByMe={followedByMe}
                            layout='inbox'
                            trigger={UserMenuTrigger}
                            onCopyLink={handleCopyLink}
                            onDelete={() => handleDelete(onDelete)}
                            onFollow={handleFollow}
                            onUnfollow={handleUnfollow}
                        />
                    </div>
                </div>
            </div>
            <FeedItemAttachment isLoading={isLoading} layout='inbox' object={object} />
        </div>
    );
};

export default InboxLayout;
