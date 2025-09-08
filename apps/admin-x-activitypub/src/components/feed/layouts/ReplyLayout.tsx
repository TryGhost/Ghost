import React from 'react';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, H4, LucideIcon} from '@tryghost/shade';

import APAvatar from '../../global/APAvatar';
import FeedItemMenu from '../FeedItemMenu';
import FeedItemStats from '../FeedItemStats';
import getUsername from '@utils/get-username';
import {handleProfileClick} from '@utils/handle-profile-click';
import {openLinksInNewTab} from '@utils/content-formatters';
import {renderFeedAttachment} from '../common/FeedItemAttachment';
import {renderTimestamp} from '@utils/render-timestamp';
import {useFeedItemActions} from '@hooks/use-feed-item-actions';
import {useNavigate} from '@tryghost/admin-x-framework';

interface ReplyLayoutProps {
    author: ActorProperties;
    allowDelete?: boolean;
    object: ObjectProperties;
    parentId?: string;
    commentCount?: number;
    repostCount?: number;
    likeCount?: number;
    last?: boolean;
    isPending?: boolean;
    isCompact?: boolean;
    isChainContinuation?: boolean;
    isChainParent?: boolean;
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

const ReplyLayout: React.FC<ReplyLayoutProps> = ({
    author,
    allowDelete = false,
    object,
    parentId,
    commentCount = 0,
    repostCount = 0,
    likeCount = 0,
    last,
    isPending = false,
    isCompact = false,
    isChainContinuation = false,
    isChainParent = false,
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

    const UserMenuTrigger = (
        <Button className={`relative z-10 size-[34px] rounded-md text-gray-900 hover:text-gray-900 dark:bg-black dark:text-gray-600 dark:hover:bg-gray-950 dark:hover:text-gray-600 [&_svg]:size-5`} data-testid="menu-button" variant='ghost'>
            <LucideIcon.Ellipsis />
        </Button>
    );

    return (
        <div className={`group/article relative ${isCompact ? 'pb-6' : isChainContinuation ? 'pb-5' : 'py-5'} ${!isPending ? 'cursor-pointer' : 'pointer-events-none'}`} data-layout='reply' data-object-id={object.id} onClick={onClick}>
            <div className={`border-1 z-10 flex items-start gap-3 border-b-gray-200`} data-test-activity>
                <div className='relative z-10 pt-[3px]'>
                    <APAvatar author={author} disabled={isPending} showFollowButton={!isAuthorCurrentUser && !followedByMe} />
                </div>
                <div className='flex w-full min-w-0 flex-col gap-2'>
                    <div className='flex w-full items-center justify-between'>
                        <div className='relative z-10 flex w-full min-w-0 flex-col overflow-visible' onClick={(e) => {
                            if (!isPending) {
                                handleProfileClick(author, navigate, e);
                            }
                        }}>
                            <div className='flex'>
                                <span className='min-w-0 truncate whitespace-nowrap font-semibold text-black break-anywhere after:mx-1 after:font-normal after:text-gray-700 after:content-["·"] dark:text-white' data-test-activity-heading>{author.name}</span>
                                <div>{renderTimestamp(object, (isPending === false && !object.authored))}</div>
                            </div>
                            <div className='flex'>
                                <span className='truncate text-gray-700'>{getUsername(author)}</span>
                            </div>
                        </div>
                        {!isCompact && <FeedItemMenu
                            allowDelete={allowDelete}
                            authoredByMe={isAuthorCurrentUser}
                            disabled={isPending}
                            followedByMe={followedByMe}
                            layout='reply'
                            trigger={UserMenuTrigger}
                            onCopyLink={handleCopyLink}
                            onDelete={() => handleDelete(onDelete)}
                            onFollow={handleFollow}
                            onUnfollow={handleUnfollow}
                        />}
                    </div>
                    <div className={`relative z-10 col-start-2 col-end-3 w-full gap-4`}>
                        <div className='flex flex-col items-start'>
                            {(object.type === 'Article') && renderFeedAttachment(object, onClick, brokenImages, onImageError)}
                            {object.name && <H4 className='mt-2.5 text-pretty leading-tight break-anywhere' data-test-activity-heading>{object.name}</H4>}
                            {(object.preview && object.type === 'Article') ? <div className='mt-1 line-clamp-3 leading-tight'>{object.preview.content}</div> : <div dangerouslySetInnerHTML={({__html: openLinksInNewTab(object.content || '') ?? ''})} ref={contentRef} className='ap-note-content text-pretty tracking-[-0.006em] text-gray-900 break-anywhere dark:text-gray-600 [&_p+p]:mt-3'></div>}
                            {(object.type === 'Note') && renderFeedAttachment(object, onImageClick, brokenImages, onImageError)}
                            {(object.type === 'Article') && <Button
                                className='mt-3 w-full'
                                id='read-more'
                                variant='secondary'
                            >Read more</Button>}
                            {!isCompact && <div className='space-between ml-[-8px] mt-2 flex'>
                                {showStats && <FeedItemStats
                                    actor={author}
                                    commentCount={commentCount}
                                    disabled={isPending}
                                    layout='reply'
                                    likeCount={likeCount}
                                    object={object}
                                    repostCount={repostCount}
                                    onLikeClick={onLikeClick || (() => {})}
                                />}
                            </div>}
                        </div>
                    </div>
                </div>
            </div>
            <div className={`absolute -inset-x-3 -inset-y-0 z-0 rounded transition-colors max-lg:hidden`}></div>
            {!last && <div className={`absolute left-[19px] ${isCompact ? 'bottom-[8px] top-[51px]' : isChainContinuation ? 'bottom-[5px] top-[51px]' : isChainParent ? 'bottom-[5px] top-[71px]' : 'bottom-[-7px] top-[71px]'} z-0 w-[2px] rounded-sm bg-gray-200 dark:bg-gray-950`}></div>}
        </div>
    );
};

export default ReplyLayout;
