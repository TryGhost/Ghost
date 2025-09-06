import React from 'react';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {H4, LucideIcon} from '@tryghost/shade';

import APAvatar from '../../global/APAvatar';
import FeedItemStats from '../FeedItemStats';
import getUsername from '@utils/get-username';
import {handleProfileClick} from '@utils/handle-profile-click';
import {openLinksInNewTab} from '@utils/content-formatters';
import {renderFeedAttachment} from '../common/FeedItemAttachment';
import {renderTimestamp} from '@utils/render-timestamp';
import {useFeedItemActions} from '@hooks/use-feed-item-actions';
import {useNavigate} from '@tryghost/admin-x-framework';

interface ModalLayoutProps {
    actor: ActorProperties;
    author: ActorProperties;
    object: ObjectProperties;
    type: string;
    commentCount?: number;
    repostCount?: number;
    likeCount?: number;
    showHeader?: boolean;
    isAuthorCurrentUser?: boolean;
    followedByMe?: boolean;
    brokenImages: Set<string>;
    onImageClick: (url: string) => void;
    onImageError: (url: string) => void;
    onClick?: () => void;
    onLikeClick?: () => void;
    showStats?: boolean;
    isPending?: boolean;
}

const repostIcon = <LucideIcon.RefreshCw className='shrink-0 text-gray-700 dark:text-gray-600' size={16} strokeWidth={1.5} />;

const ModalLayout: React.FC<ModalLayoutProps> = ({
    actor,
    author,
    object,
    type,
    commentCount = 0,
    repostCount = 0,
    likeCount = 0,
    showHeader = true,
    isAuthorCurrentUser = false,
    followedByMe = false,
    brokenImages,
    onImageClick,
    onImageError,
    onClick,
    onLikeClick,
    showStats = true,
    isPending = false
}) => {
    const navigate = useNavigate();

    const {contentRef} = useFeedItemActions({
        author,
        object,
        enableProfileLinkHandling: true
    });

    return (
        <div data-object-id={object.id}>
            <div className={`group/article relative`} data-layout='modal' onClick={onClick}>
                <div className={`z-10 -my-1 grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-3 pb-3 pt-4`} data-test-activity>
                    {(type === 'Announce') && <div className='z-10 col-span-2 mb-2 flex items-center gap-2 text-gray-700 dark:text-gray-600'>
                        <div>{repostIcon}</div>
                        <span className='flex min-w-0 items-center gap-1'><span className='truncate break-anywhere hover:underline' title={getUsername(actor)} onClick={(e) => {
                            handleProfileClick(actor, navigate, e);
                        }}>{actor.name}</span> reposted</span>
                    </div>}
                    {(showHeader) && <>
                        <div className='relative z-10 pt-[3px]'>
                            <APAvatar author={author} showFollowButton={!isAuthorCurrentUser && !followedByMe} />
                        </div>
                        <div className='relative z-10 flex w-full min-w-0 cursor-pointer flex-col overflow-visible text-[1.5rem]' onClick={(e) => {
                            if (!isPending) {
                                handleProfileClick(author, navigate, e);
                            }
                        }}>
                            <div className='flex w-full'>
                                <span className='min-w-0 truncate whitespace-nowrap font-semibold break-anywhere after:mx-1 after:font-normal after:text-gray-700 after:content-["·"] after:dark:text-gray-600' data-test-activity-heading>{author.name}</span>
                                <div>{renderTimestamp(object, !object.authored)}</div>
                            </div>
                            <div className='flex w-full'>
                                <span className='min-w-0 truncate text-gray-700 dark:text-gray-600'>{getUsername(author)}</span>
                            </div>
                        </div>
                    </>}
                    <div className={`relative z-10 col-start-1 col-end-3 w-full gap-4`}>
                        <div className='flex flex-col items-start'>
                            {object.name && <H4 className='mb-1 leading-tight break-anywhere' data-test-activity-heading>{object.name}</H4>}
                            <div dangerouslySetInnerHTML={({__html: openLinksInNewTab(object.content || '') ?? ''})} ref={contentRef} className='ap-note-content-large text-pretty text-[1.6rem] tracking-[-0.011em] text-gray-900 break-anywhere dark:text-gray-600 [&_p+p]:mt-3'></div>
                            {renderFeedAttachment(object, onImageClick, brokenImages, onImageError)}
                            <div className='space-between ml-[-8px] mt-3 flex'>
                                {showStats && <FeedItemStats
                                    actor={author}
                                    commentCount={commentCount}
                                    layout='modal'
                                    likeCount={likeCount}
                                    object={object}
                                    repostCount={repostCount}
                                    onLikeClick={onLikeClick || (() => {})}
                                />}
                            </div>
                        </div>
                    </div>
                </div>
                <div className={`absolute -inset-x-3 -inset-y-0 z-0 rounded transition-colors max-lg:hidden`}></div>
            </div>
            <div className="mt-3 h-px bg-gray-200 dark:bg-gray-950"></div>
        </div>
    );
};

export default ModalLayout;
