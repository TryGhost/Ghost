import React, {useEffect, useState} from 'react';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, LucideIcon, Skeleton} from '@tryghost/shade';

import FeedItemHeader from '../common/FeedItemHeader';
import FeedItemMenu from '../FeedItemMenu';
import FeedItemStats from '../FeedItemStats';
import getUsername from '@utils/get-username';
import {handleProfileClick} from '@utils/handle-profile-click';
import {openLinksInNewTab} from '@utils/content-formatters';
import {renderFeedAttachment} from '../common/FeedItemAttachment';
import {useFeedItemActions} from '@hooks/use-feed-item-actions';
import {useNavigate} from '@tryghost/admin-x-framework';

interface FeedLayoutProps {
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
    isPending?: boolean;
    isCompact?: boolean;
    isAuthorCurrentUser?: boolean;
    followedByMe?: boolean;
    brokenImages: Set<string>;
    onImageClick: (url: string) => void;
    onImageError: (url: string) => void;
    onClick?: () => void;
    onDelete?: () => void;
    onLikeClick?: () => void;
    showStats?: boolean;
}

const repostIcon = <LucideIcon.RefreshCw className='shrink-0 text-gray-700 dark:text-gray-600' size={16} strokeWidth={1.5} />;

const FeedLayout: React.FC<FeedLayoutProps> = ({
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
    isPending = false,
    isCompact = false,
    isAuthorCurrentUser = false,
    followedByMe = false,
    brokenImages,
    onImageClick,
    onImageError,
    onClick,
    onDelete,
    onLikeClick,
    showStats = true
}) => {
    const navigate = useNavigate();
    const [isTruncated, setIsTruncated] = useState(false);

    const {
        contentRef,
        actions: {
            handleDelete,
            handleCopyLink,
            handleFollow,
            handleUnfollow
        }
    } = useFeedItemActions({
        author,
        object,
        parentId,
        enableProfileLinkHandling: true
    });

    useEffect(() => {
        const element = contentRef.current;
        if (element) {
            setIsTruncated(element.scrollHeight > element.clientHeight);
        }
    }, [object?.content, contentRef]);

    const UserMenuTrigger = (
        <Button className={`relative z-10 size-[34px] rounded-md text-gray-500 hover:text-gray-500 dark:bg-black dark:hover:bg-gray-950 [&_svg]:size-5`} data-testid="menu-button" variant='ghost'>
            <LucideIcon.Ellipsis />
        </Button>
    );

    return (
        <div className={`group/article relative -mx-4 ${!isPending ? 'cursor-pointer' : 'pointer-events-none'} rounded-lg p-6 px-4 pb-[18px]`} data-layout='feed' data-object-id={object.id} onClick={onClick}>
            {(type === 'Announce') && <div className='z-10 mb-2 flex items-center gap-1.5 text-gray-700 dark:text-gray-600'>
                {repostIcon}
                <div className='flex min-w-0 items-center gap-1 text-sm'>
                    <span className='truncate break-anywhere hover:underline' title={getUsername(actor)} onClick={(e) => {
                        handleProfileClick(actor, navigate, e);
                    }}>{actor.name}</span>
                    reposted
                </div>
            </div>}
            <div className={`border-1 flex flex-col gap-2.5`} data-test-activity>
                <div className='flex min-w-0 items-center gap-3'>
                    <FeedItemHeader
                        author={author}
                        followedByMe={followedByMe}
                        isAuthorCurrentUser={isAuthorCurrentUser}
                        isCompact={isCompact}
                        isLoading={isLoading}
                        isPending={isPending}
                        object={object}
                    />
                    <FeedItemMenu
                        allowDelete={allowDelete}
                        authoredByMe={isAuthorCurrentUser}
                        disabled={isPending}
                        followedByMe={followedByMe}
                        layout='feed'
                        trigger={UserMenuTrigger}
                        onCopyLink={handleCopyLink}
                        onDelete={() => handleDelete(onDelete)}
                        onFollow={handleFollow}
                        onUnfollow={handleUnfollow}
                    />
                </div>
                <div className='relative col-start-2 col-end-3 w-full gap-4 pl-[52px]'>
                    <div className='flex flex-col'>
                        <div className=''>
                            {(object.type === 'Article') ? <div className='rounded-md border border-gray-150 transition-colors hover:bg-gray-75 dark:border-gray-950 dark:hover:bg-gray-950'>
                                {renderFeedAttachment(object, onClick, brokenImages, onImageError)}
                                <div className='p-5'>
                                    <div className='mb-1 line-clamp-2 text-pretty text-lg font-semibold leading-tight tracking-tight break-anywhere' data-test-activity-heading>{object.name}</div>
                                    <div className='line-clamp-3 leading-[1.4em] break-anywhere'>{object.preview?.content}</div>
                                </div>
                            </div> :
                                <div className='relative'>
                                    <div className='ap-note-content line-clamp-[10] text-pretty leading-[1.4285714286] tracking-[-0.006em] text-gray-900 break-anywhere dark:text-gray-600 [&_p+p]:mt-3'>
                                        {!isLoading ?
                                            <div dangerouslySetInnerHTML={{
                                                __html: openLinksInNewTab(object.content || '') ?? ''
                                            }} ref={contentRef}
                                            onClick={(e) => {
                                                const target = e.target as HTMLElement;
                                                if (
                                                    target.tagName === 'A' ||
                                                    target.closest('a')
                                                ) {
                                                    e.stopPropagation();
                                                }
                                            }}
                                            />
                                            :
                                            <Skeleton count={2} />
                                        }
                                    </div>
                                    {isTruncated && (
                                        <button className='mt-1 text-blue-600' type='button'>Show more</button>
                                    )}
                                    {renderFeedAttachment(object, onImageClick, brokenImages, onImageError)}
                                </div>
                            }
                        </div>
                        <div className='space-between relative z-[30] ml-[-8px] mt-1 flex'>
                            {!isLoading ?
                                showStats && <FeedItemStats
                                    actor={author}
                                    commentCount={commentCount}
                                    disabled={isPending}
                                    layout='feed'
                                    likeCount={likeCount}
                                    object={object}
                                    repostCount={repostCount}
                                    onLikeClick={onLikeClick || (() => {})}
                                /> :
                                <Skeleton className='ml-2 w-18' />
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeedLayout;
