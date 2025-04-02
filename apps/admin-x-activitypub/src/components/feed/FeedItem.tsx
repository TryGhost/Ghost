import FeedItemMenu from './FeedItemMenu';
import React, {useEffect, useRef, useState} from 'react';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, LucideIcon, Skeleton} from '@tryghost/shade';
import {Button as ButtonX, Heading, Icon, showToast} from '@tryghost/admin-x-design-system';

import APAvatar from '../global/APAvatar';

import FeedItemStats from './FeedItemStats';
import clsx from 'clsx';
import getReadingTime from '../../utils/get-reading-time';
import getUsername from '../../utils/get-username';
import {handleProfileClick, handleProfileClickRR} from '../../utils/handle-profile-click';
import {openLinksInNewTab, stripHtml} from '../../utils/content-formatters';
import {renderTimestamp} from '../../utils/render-timestamp';
import {useDeleteMutationForUser} from '../../hooks/use-activity-pub-queries';
import {useFeatureFlags} from '@src/lib/feature-flags';
import {useNavigate} from '@tryghost/admin-x-framework';

function getAttachment(object: ObjectProperties) {
    let attachment;

    if (object.image) {
        attachment = object.image;
    }

    if (object.type === 'Note' && !attachment) {
        attachment = object.attachment;
    }

    if (!attachment) {
        return null;
    }

    if (Array.isArray(attachment)) {
        if (attachment.length === 0) {
            return null;
        }
        if (attachment.length === 1) {
            return attachment[0];
        }
    }

    return attachment;
}

export function renderFeedAttachment(object: ObjectProperties) {
    const attachment = getAttachment(object);

    if (!attachment) {
        return null;
    }

    if (Array.isArray(attachment)) {
        const attachmentCount = attachment.length;

        let gridClass = '';
        if (attachmentCount === 1) {
            gridClass = 'grid-cols-1'; // Single image, full width
        } else if (attachmentCount >= 2 && attachmentCount <= 4) {
            gridClass = 'grid-cols-2 auto-rows-[150px]'; // 2-4 images, two per row
        } else if (attachmentCount > 4) {
            gridClass = 'grid-cols-3 auto-rows-[150px]'; // >4 images, three per row
        }

        return (
            <div className={`attachment-gallery mt-3 grid ${gridClass} gap-2`}>
                {attachment.map((item, index) => (
                    <img key={item.url} alt={item.name || `Image-${index}`} className={`size-full rounded-md object-cover outline outline-1 -outline-offset-1 outline-black/10 ${attachmentCount === 3 && index === 0 ? 'row-span-2' : ''}`} src={item.url} />
                ))}
            </div>
        );
    }

    switch (attachment.mediaType) {
    case 'image/jpeg':
    case 'image/png':
    case 'image/gif':
        return <img alt={attachment.name || 'Image'} className={`${object.type === 'Article' ? 'w-full rounded-t-md' : 'mt-3 max-h-[420px] rounded-md outline outline-1 -outline-offset-1 outline-black/10'}`} src={attachment.url} />;
    case 'video/mp4':
    case 'video/webm':
        return <div className='relative mb-4 mt-3'>
            <video className='h-[300px] w-full rounded object-cover' src={attachment.url} controls/>
        </div>;
    case 'audio/mpeg':
    case 'audio/ogg':
        return <div className='relative mb-4 mt-2 w-full'>
            <audio className='w-full' src={attachment.url} controls/>
        </div>;
    default:
        if (object.image || attachment.type === 'Image') {
            const imageClassName = object.type === 'Article'
                ? 'aspect-[16/7.55] w-full rounded-t-md object-cover'
                : 'mt-3 max-h-[420px] rounded-md outline outline-1 -outline-offset-1 outline-black/10';

            let imageUrl;
            if (object.image === undefined) {
                imageUrl = attachment.url;
            } else if (typeof object.image === 'string') {
                imageUrl = object.image;
            } else {
                imageUrl = object.image?.url;
            }

            return (
                <img
                    alt={attachment.name || 'Image'}
                    className={imageClassName}
                    src={imageUrl}
                />
            );
        }
        return null;
    }
}

function renderInboxAttachment(object: ObjectProperties, isLoading: boolean | undefined) {
    const attachment = getAttachment(object);

    const videoAttachmentStyles = 'ml-8 md:ml-9 shrink-0 rounded-md h-[91px] w-[121px] relative';
    const imageAttachmentStyles = clsx('object-cover outline outline-1 -outline-offset-1 outline-black/[0.05]', videoAttachmentStyles);

    if (isLoading) {
        return <Skeleton className={`${imageAttachmentStyles} outline-0`} />;
    }

    if (!attachment) {
        return null;
    }

    if (Array.isArray(attachment)) {
        return (
            <img className={imageAttachmentStyles} src={attachment[0].url} />
        );
    }

    switch (attachment.mediaType) {
    case 'image/jpeg':
    case 'image/png':
    case 'image/gif':
        return (
            <img className={imageAttachmentStyles} src={attachment.url} />
        );
    case 'video/mp4':
    case 'video/webm':
        return (
            <div className={videoAttachmentStyles}>
                <video className='h-[80px] w-full rounded object-cover' src={attachment.url} />
                <div className='absolute inset-0 rounded bg-gray-900 opacity-50'></div>
                <div className='absolute inset-0 flex items-center justify-center'>
                    <Icon className='text-white' name='play-fill' size='lg' />
                </div>
            </div>
        );

    case 'audio/mpeg':
    case 'audio/ogg':
        return (
            <div className='ml-8 w-[120px]'>
                <div className='relative mb-4 mt-2 w-full'>
                    <audio className='w-full' src={attachment.url} controls/>
                </div>
            </div>
        );
    default:
        if (object.image) {
            return <img className={imageAttachmentStyles} src={typeof object.image === 'string' ? object.image : object.image?.url} />;
        }
        return null;
    }
}

interface FeedItemProps {
    actor: ActorProperties;
    allowDelete?: boolean;
    object: ObjectProperties;
    parentId?: string;
    layout: string;
    type: string;
    commentCount?: number;
    repostCount?: number;
    showHeader?: boolean;
    last?: boolean;
    isLoading?: boolean;
    isPending?: boolean;
    onClick?: () => void;
    onCommentClick: () => void;
    onDelete?: () => void;
    showStats?: boolean;
}

const noop = () => {};

const FeedItem: React.FC<FeedItemProps> = ({
    actor,
    allowDelete = false,
    object,
    parentId = undefined,
    layout,
    type,
    commentCount = 0,
    repostCount = 0,
    showHeader = true,
    last,
    isLoading,
    isPending = false,
    onClick: onClickHandler = noop,
    onCommentClick,
    onDelete = noop,
    showStats = true
}) => {
    const timestamp =
        new Date(object?.published ?? new Date()).toLocaleDateString('default', {year: 'numeric', month: 'short', day: '2-digit'}) + ', ' + new Date(object?.published ?? new Date()).toLocaleTimeString('default', {hour: '2-digit', minute: '2-digit'});

    const [, setIsCopied] = useState(false);

    const contentRef = useRef<HTMLDivElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);

    const deleteMutation = useDeleteMutationForUser('index');

    useEffect(() => {
        const element = contentRef.current;
        if (element) {
            setIsTruncated(element.scrollHeight > element.clientHeight);
        }
    }, [object?.content]);

    const onLikeClick = () => {
        // Do API req or smth
        // Don't need to know about setting timeouts or anything like that
    };

    const onClick = () => {
        if (isPending) {
            return;
        }

        onClickHandler();
    };

    const handleDelete = () => {
        deleteMutation.mutate({id: object.id, parentId});

        onDelete();
    };

    const handleCopyLink = async () => {
        if (object?.url) {
            await navigator.clipboard.writeText(object.url);
            setIsCopied(true);
            showToast({
                title: 'Link copied',
                type: 'success'
            });
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    let author = actor;
    if (type === 'Announce') {
        author = typeof object.attributedTo === 'object' ? object.attributedTo as ActorProperties : actor;
    }

    const UserMenuTrigger = (
        <Button className={`relative z-10 size-[34px] rounded-md ${layout === 'inbox' || layout === 'modal' ? 'text-gray-900 hover:text-gray-900 dark:text-gray-600 dark:hover:text-gray-600' : 'text-gray-500 hover:text-gray-500'} dark:bg-black dark:hover:bg-gray-950 [&_svg]:size-5`} variant='ghost'>
            <LucideIcon.Ellipsis />
        </Button>
    );

    const {isEnabled} = useFeatureFlags();
    const navigate = useNavigate();

    if (layout === 'feed') {
        return (
            <>
                {object && (
                    <div className={`group/article relative -mx-4 ${!isPending ? 'cursor-pointer' : 'pointer-events-none'} rounded-lg p-6 px-4 pb-[18px]`} data-layout='feed' data-object-id={object.id} onClick={onClick}>
                        {(type === 'Announce') && <div className='z-10 mb-2 flex items-center gap-2 text-gray-700 dark:text-gray-600'>
                            <Icon colorClass='text-gray-700 shrink-0 dark:text-gray-600' name='reload' size={'sm'} />
                            <div className='flex min-w-0 items-center gap-1 text-sm'>
                                <span className='truncate break-all hover:underline' title={getUsername(actor)} onClick={(e) => {
                                    if (isEnabled('ap-routes')) {
                                        handleProfileClickRR(actor, navigate, e);
                                    } else {
                                        handleProfileClick(actor, e);
                                    }
                                }}>{actor.name}</span>
                                reposted
                            </div>
                        </div>}
                        <div className={`border-1 flex flex-col gap-2.5`} data-test-activity>
                            <div className='flex min-w-0 items-center gap-3'>
                                <APAvatar author={author} disabled={isPending} />
                                <div className='flex min-w-0 grow flex-col gap-0.5' onClick={(e) => {
                                    if (!isPending) {
                                        if (isEnabled('ap-routes')) {
                                            handleProfileClickRR(author, navigate, e);
                                        } else {
                                            handleProfileClick(author, e);
                                        }
                                    }
                                }}>
                                    <span className={`min-w-0 truncate break-all font-semibold leading-[normal] ${!isPending ? 'hover-underline' : ''} dark:text-white`}
                                        data-test-activity-heading
                                    >
                                        {!isLoading ? author.name : <Skeleton className='w-24' />}
                                    </span>
                                    <div className='flex w-full text-sm text-gray-700 dark:text-gray-600'>
                                        <span className={`truncate leading-tight ${!isPending ? 'hover-underline' : ''}`}>
                                            {!isLoading ? getUsername(author) : <Skeleton className='w-56' />}
                                        </span>
                                        <div className={`ml-1 leading-tight before:mr-1 ${!isLoading && 'before:content-["·"]'}`} title={`${timestamp}`}>
                                            {!isLoading ? renderTimestamp(object, (isPending === false && !object.authored)) : <Skeleton className='w-4' />}
                                        </div>
                                    </div>
                                </div>
                                <FeedItemMenu
                                    allowDelete={allowDelete}
                                    disabled={isPending}
                                    layout='feed'
                                    trigger={UserMenuTrigger}
                                    onCopyLink={handleCopyLink}
                                    onDelete={handleDelete}
                                />
                            </div>
                            <div className='relative col-start-2 col-end-3 w-full gap-4 pl-[52px]'>
                                <div className='flex flex-col'>
                                    <div className=''>
                                        {(object.type === 'Article') ? <div className='rounded-md border border-gray-150 transition-colors hover:bg-gray-75 dark:border-gray-950 dark:hover:bg-gray-950'>
                                            {renderFeedAttachment(object)}
                                            <div className='p-5'>
                                                <div className='mb-1 text-pretty text-lg font-semibold leading-tight tracking-tight' data-test-activity-heading>{object.name}</div>
                                                <div className='line-clamp-3 leading-[1.4em]'>{object.preview?.content}</div>
                                            </div>
                                        </div> :
                                            <div className='relative'>
                                                <div className='ap-note-content line-clamp-[10] text-pretty leading-[1.4285714286] tracking-[-0.006em] text-gray-900 dark:text-gray-600 [&_p+p]:mt-3'>
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
                                                {renderFeedAttachment(object)}
                                            </div>
                                        }
                                    </div>
                                    <div className='space-between relative z-[30] ml-[-7px] mt-1 flex'>
                                        {!isLoading ?
                                            showStats && <FeedItemStats
                                                commentCount={commentCount}
                                                disabled={isPending}
                                                layout={layout}
                                                likeCount={1}
                                                object={object}
                                                repostCount={repostCount}
                                                onCommentClick={onCommentClick}
                                                onLikeClick={onLikeClick}
                                            /> :
                                            <Skeleton className='ml-2 w-18' />
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    } else if (layout === 'modal') {
        return (
            <>
                {object && (
                    <div data-object-id={object.id}>
                        <div className={`group/article relative`} data-layout='modal' onClick={onClick}>
                            <div className={`z-10 -my-1 grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-3 pb-3 pt-4`} data-test-activity>
                                {(type === 'Announce') && <div className='z-10 col-span-2 mb-2 flex items-center gap-2 text-gray-700 dark:text-gray-600'>
                                    <div><Icon colorClass='text-gray-700 shrink-0 dark:text-gray-600' name='reload' size={'sm'}></Icon></div>
                                    <span className='flex min-w-0 items-center gap-1'><span className='truncate break-all hover:underline' title={getUsername(actor)} onClick={(e) => {
                                        if (isEnabled('ap-routes')) {
                                            handleProfileClickRR(actor, navigate, e);
                                        } else {
                                            handleProfileClick(actor, e);
                                        }
                                    }}>{actor.name}</span> reposted</span>
                                </div>}
                                {(showHeader) && <>
                                    <div className='relative z-10 pt-[3px]'>
                                        <APAvatar author={author}/>
                                    </div>
                                    <div className='relative z-10 flex w-full min-w-0 cursor-pointer flex-col overflow-visible text-[1.5rem]' onClick={(e) => {
                                        if (!isPending) {
                                            if (isEnabled('ap-routes')) {
                                                handleProfileClickRR(author, navigate, e);
                                            } else {
                                                handleProfileClick(author, e);
                                            }
                                        }
                                    }}>
                                        <div className='flex w-full'>
                                            <span className='min-w-0 truncate whitespace-nowrap font-semibold after:mx-1 after:font-normal after:text-gray-700 after:content-["·"] after:dark:text-gray-600' data-test-activity-heading>{author.name}</span>
                                            <div>{renderTimestamp(object, !object.authored)}</div>
                                        </div>
                                        <div className='flex w-full'>
                                            <span className='min-w-0 truncate text-gray-700 dark:text-gray-600'>{getUsername(author)}</span>
                                        </div>
                                    </div>
                                </>}
                                <div className={`relative z-10 col-start-1 col-end-3 w-full gap-4`}>
                                    <div className='flex flex-col items-start'>
                                        {object.name && <Heading className='mb-1 leading-tight' level={4} data-test-activity-heading>{object.name}</Heading>}
                                        <div dangerouslySetInnerHTML={({__html: openLinksInNewTab(object.content || '') ?? ''})} className='ap-note-content-large text-pretty text-[1.6rem] tracking-[-0.011em] text-gray-900 dark:text-gray-600 [&_p+p]:mt-3'></div>
                                        {renderFeedAttachment(object)}
                                        <div className='space-between ml-[-7px] mt-3 flex'>
                                            {showStats && <FeedItemStats
                                                commentCount={commentCount}
                                                layout={layout}
                                                likeCount={1}
                                                object={object}
                                                repostCount={repostCount}
                                                onCommentClick={onCommentClick}
                                                onLikeClick={onLikeClick}
                                            />}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={`absolute -inset-x-3 -inset-y-0 z-0 rounded transition-colors`}></div>
                        </div>
                        <div className="mt-3 h-px bg-gray-200 dark:bg-gray-950"></div>
                    </div>

                )}
            </>
        );
    } else if (layout === 'reply') {
        return (
            <>
                {object && (
                    <div className={`group/article relative py-5 ${!isPending ? 'cursor-pointer' : 'pointer-events-none'}`} data-layout='reply' data-object-id={object.id} onClick={onClick}>
                        <div className={`border-1 z-10 flex items-start gap-3 border-b-gray-200`} data-test-activity>
                            <div className='relative z-10 pt-[3px]'>
                                <APAvatar author={author} disabled={isPending} />
                            </div>
                            <div className='flex w-full min-w-0 flex-col gap-2'>
                                <div className='flex w-full items-center justify-between'>
                                    <div className='relative z-10 flex w-full min-w-0 flex-col overflow-visible' onClick={(e) => {
                                        if (!isPending) {
                                            if (isEnabled('ap-routes')) {
                                                handleProfileClickRR(author, navigate, e);
                                            } else {
                                                handleProfileClick(author, e);
                                            }
                                        }
                                    }}>
                                        <div className='flex'>
                                            <span className='min-w-0 truncate whitespace-nowrap font-semibold after:mx-1 after:font-normal after:text-gray-700 after:content-["·"]' data-test-activity-heading>{author.name}</span>
                                            <div>{renderTimestamp(object, (isPending === false && !object.authored))}</div>
                                        </div>
                                        <div className='flex'>
                                            <span className='truncate text-gray-700'>{getUsername(author)}</span>
                                        </div>
                                    </div>
                                    <FeedItemMenu
                                        allowDelete={allowDelete}
                                        disabled={isPending}
                                        layout='reply'
                                        trigger={UserMenuTrigger}
                                        onCopyLink={handleCopyLink}
                                        onDelete={handleDelete}
                                    />
                                </div>
                                <div className={`relative z-10 col-start-2 col-end-3 w-full gap-4`}>
                                    <div className='flex flex-col'>
                                        {(object.type === 'Article') && renderFeedAttachment(object)}
                                        {object.name && <Heading className='my-1 text-pretty leading-tight' level={5} data-test-activity-heading>{object.name}</Heading>}
                                        {(object.preview && object.type === 'Article') ? <div className='line-clamp-3 leading-tight'>{object.preview.content}</div> : <div dangerouslySetInnerHTML={({__html: openLinksInNewTab(object.content || '') ?? ''})} className='ap-note-content text-pretty tracking-[-0.006em] text-gray-900 dark:text-gray-600 [&_p+p]:mt-3'></div>}
                                        {(object.type === 'Note') && renderFeedAttachment(object)}
                                        {(object.type === 'Article') && <ButtonX
                                            className={`mt-3 self-start text-gray-900 transition-all hover:opacity-60`}
                                            color='grey'
                                            fullWidth={true}
                                            id='read-more'
                                            label='Read more'
                                            size='md'
                                        />}
                                        <div className='space-between ml-[-7px] mt-2 flex'>
                                            {showStats && <FeedItemStats
                                                commentCount={commentCount}
                                                disabled={isPending}
                                                layout={layout}
                                                likeCount={1}
                                                object={object}
                                                repostCount={repostCount}
                                                onCommentClick={onCommentClick}
                                                onLikeClick={onLikeClick}
                                            />}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={`absolute -inset-x-3 -inset-y-0 z-0 rounded transition-colors`}></div>
                        {!last && <div className="absolute bottom-0 left-[18px] top-[6.5rem] z-0 mb-[-13px] w-[2px] rounded-sm bg-gray-200"></div>}
                    </div>
                )}
            </>
        );
    } else if (layout === 'inbox') {
        return (
            <>
                {object && (
                    <div className='group/article relative -mx-4 -my-px flex min-h-[112px] min-w-0 cursor-pointer items-center justify-between rounded-lg p-6 hover:bg-gray-75 dark:hover:bg-gray-950/50' data-layout='inbox' data-object-id={object.id} onClick={onClick}>
                        <div className='w-full min-w-0'>
                            <div className='z-10 mb-1.5 flex w-full min-w-0 items-center gap-1.5 text-sm group-hover/article:border-transparent'>
                                {!isLoading ?
                                    <>
                                        <APAvatar author={author} size='2xs' />
                                        <span className='min-w-0 truncate break-all font-semibold text-gray-900 hover:underline dark:text-gray-600'
                                            title={getUsername(author)}
                                            data-test-activity-heading
                                            onClick={(e) => {
                                                if (isEnabled('ap-routes')) {
                                                    handleProfileClickRR(author, navigate, e);
                                                } else {
                                                    handleProfileClick(author, e);
                                                }
                                            }}
                                        >{author.name}
                                        </span>
                                        {(type === 'Announce') && <span className='z-10 flex items-center gap-1 text-gray-700 dark:text-gray-600'><Icon colorClass='text-gray-700 shrink-0 dark:text-gray-600' name='reload' size={'sm'}></Icon><span className='hover:underline' title={getUsername(actor)} onClick={(e) => {
                                            if (isEnabled('ap-routes')) {
                                                handleProfileClickRR(actor, navigate, e);
                                            } else {
                                                handleProfileClick(actor, e);
                                            }
                                        }}>{actor.name}</span> reposted</span>}
                                        <span className='shrink-0 whitespace-nowrap text-gray-600 before:mr-1 before:content-["·"]' title={`${timestamp}`}>{renderTimestamp(object, !object.authored)}</span>
                                    </> :
                                    <Skeleton className='w-24' />
                                }
                            </div>
                            <div className='flex'>
                                <div className='flex min-h-[73px] w-full min-w-0 flex-col items-start justify-start gap-1'>
                                    <Heading className='w-full max-w-[600px] text-pretty text-[1.6rem] font-semibold leading-tight' level={5} data-test-activity-heading>
                                        {isLoading ? <Skeleton className='w-full max-w-96' /> : (object.name ? object.name : (
                                            <span dangerouslySetInnerHTML={{
                                                __html: stripHtml(object.content || '')
                                            }}></span>
                                        ))}
                                    </Heading>
                                    <div className='ap-note-content line-clamp-2 w-full max-w-[600px] text-pretty text-base leading-normal text-gray-800 dark:text-gray-600 [&_p+p]:mt-3'>
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
                                        commentCount={commentCount}
                                        layout={layout}
                                        likeCount={1}
                                        object={object}
                                        repostCount={repostCount}
                                        onCommentClick={onCommentClick}
                                        onLikeClick={onLikeClick}
                                    />}
                                    <FeedItemMenu
                                        allowDelete={allowDelete}
                                        layout='inbox'
                                        trigger={UserMenuTrigger}
                                        onCopyLink={handleCopyLink}
                                        onDelete={handleDelete}
                                    />
                                </div>
                            </div>
                        </div>
                        {renderInboxAttachment(object, isLoading)}
                    </div>
                )}
            </>
        );
    }

    return (<></>);
};

export default FeedItem;
