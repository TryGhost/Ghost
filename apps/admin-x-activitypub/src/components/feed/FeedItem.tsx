import React, {useState} from 'react';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Heading, Icon, Menu, MenuItem, showToast} from '@tryghost/admin-x-design-system';

import APAvatar from '../global/APAvatar';

import FeedItemStats from './FeedItemStats';
import clsx from 'clsx';
import getRelativeTimestamp from '../../utils/get-relative-timestamp';
import getUsername from '../../utils/get-username';
import stripHtml from '../../utils/strip-html';
import {renderTimestamp} from '../../utils/render-timestamp';

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

export function renderFeedAttachment(object: ObjectProperties, layout: string) {
    const attachment = getAttachment(object);

    if (!attachment) {
        return null;
    }

    if (Array.isArray(attachment)) {
        const attachmentCount = attachment.length;

        let gridClass = '';
        if (layout === 'modal') {
            gridClass = 'grid-cols-1'; // Single image, full width
        } else if (attachmentCount === 2) {
            gridClass = 'grid-cols-2 auto-rows-[150px]'; // Two images, side by side
        } else if (attachmentCount === 3 || attachmentCount === 4) {
            gridClass = 'grid-cols-2 auto-rows-[150px]'; // Three or four images, two per row
        }

        return (
            <div className={`attachment-gallery mt-3 grid ${gridClass} gap-2`}>
                {attachment.map((item, index) => (
                    <img key={item.url} alt={`attachment-${index}`} className={`h-full w-full rounded-md object-cover outline outline-1 -outline-offset-1 outline-black/10 ${attachmentCount === 3 && index === 0 ? 'row-span-2' : ''}`} src={item.url} />
                ))}
            </div>
        );
    }

    switch (attachment.mediaType) {
    case 'image/jpeg':
    case 'image/png':
    case 'image/gif':
        return <img alt='attachment' className='mt-3 rounded-md outline outline-1 -outline-offset-1 outline-black/10' src={attachment.url} />;
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
        if (object.image) {
            return <img alt='attachment' className='my-3 max-h-[280px] w-full rounded-md object-cover outline outline-1 -outline-offset-1 outline-black/[0.05]' src={object.image} />;
        }
        return null;
    }
}

function renderInboxAttachment(object: ObjectProperties) {
    const attachment = getAttachment(object);

    const videoAttachmentStyles = 'ml-8 shrink-0 rounded-md h-[80px] w-[120px] relative';
    const imageAttachmentStyles = clsx('object-cover outline outline-1 -outline-offset-1 outline-black/[0.05]', videoAttachmentStyles);

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
                <div className='absolute inset-0 rounded bg-grey-900 opacity-50'></div>
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
            return <img className={imageAttachmentStyles} src={object.image} />;
        }
        return null;
    }
}

interface FeedItemProps {
    actor: ActorProperties;
    object: ObjectProperties;
    layout: string;
    type: string;
    commentCount?: number;
    showHeader?: boolean;
    last?: boolean;
    onClick?: () => void;
    onCommentClick: () => void;
}

const noop = () => {};

const FeedItem: React.FC<FeedItemProps> = ({actor, object, layout, type, commentCount = 0, showHeader = true, last, onClick = noop, onCommentClick}) => {
    const timestamp =
        new Date(object?.published ?? new Date()).toLocaleDateString('default', {year: 'numeric', month: 'short', day: '2-digit'}) + ', ' + new Date(object?.published ?? new Date()).toLocaleTimeString('default', {hour: '2-digit', minute: '2-digit'});

    const date = new Date(object?.published ?? new Date());

    const [isCopied, setIsCopied] = useState(false);

    const onLikeClick = () => {
        // Do API req or smth
        // Don't need to know about setting timeouts or anything like that
    };

    // const handleDelete = () => {
    //     // Handle delete action
    // };

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
    if (type === 'Announce' && object.type === 'Note') {
        author = typeof object.attributedTo === 'object' ? object.attributedTo as ActorProperties : actor;
    }

    const menuItems: MenuItem[] = [];

    menuItems.push({
        id: 'copy-link',
        label: 'Copy link to post',
        onClick: handleCopyLink
    });

    // TODO: If this is your own Note/Article, you should be able to delete it
    // menuItems.push({
    //     id: 'delete',
    //     label: 'Delete',
    //     destructive: true,
    //     onClick: handleDelete
    // });

    const UserMenuTrigger = (
        <Button
            className={`relative z-[9998] ml-auto flex h-5 w-5 items-center justify-center self-start hover:opacity-60 ${isCopied ? 'bump' : ''}`}
            hideLabel={true}
            icon='dotdotdot'
            iconColorClass={`(${layout === 'inbox' ? 'text-grey-900' : 'text-grey-600'}`}
            id='more'
            size='sm'
            unstyled={true}
        />
    );

    if (layout === 'feed') {
        return (
            <>
                {object && (
                    <div className={`group/article relative cursor-pointer pt-6`} data-layout='feed' data-object-id={object.id} onClick={onClick}>
                        {(type === 'Announce' && object.type === 'Note') && <div className='z-10 mb-2 flex items-center gap-3 text-grey-700'>
                            <div className='z-10 flex w-10 justify-end'><Icon colorClass='text-grey-700' name='reload' size={'sm'}></Icon></div>
                            <span className='z-10'>{actor.name} reposted</span>
                        </div>}
                        <div className={`border-1 -my-1 grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-x-3 gap-y-2 pb-6`} data-test-activity>
                            <APAvatar author={author}/>
                            <div className='flex min-w-0 justify-between'>
                                <div className='relative z-10 flex w-full flex-col overflow-visible text-md'>
                                    <div className='flex justify-between'>
                                        <div className='flex w-full'>
                                            <span className='min-w-0 truncate break-all font-semibold' data-test-activity-heading>{author.name}</span>
                                            <span className='ml-1 truncate text-grey-700'>{getUsername(author)}</span>
                                        </div>
                                        <div className='ml-2'>{renderTimestamp(object)}</div>
                                    </div>
                                </div>
                            </div>
                            <div className={`relative col-start-2 col-end-3 w-full gap-4`}>
                                <div className='flex flex-col'>
                                    <div className='mt-[-24px]'>
                                        {(object.type === 'Article') && renderFeedAttachment(object, layout)}
                                        {object.name && <Heading className='my-1 text-pretty leading-tight' level={5} data-test-activity-heading>{object.name}</Heading>}
                                        {(object.preview && object.type === 'Article') ? <div className='line-clamp-3 leading-tight'>{object.preview.content}</div> : <div dangerouslySetInnerHTML={({__html: object.content})} className='ap-note-content text-pretty text-[1.5rem] text-grey-900'></div>}
                                        {(object.type === 'Note') && renderFeedAttachment(object, layout)}
                                        {(object.type === 'Article') && <Button
                                            className={`mt-3 self-start text-grey-900 transition-all hover:opacity-60`}
                                            color='grey'
                                            fullWidth={true}
                                            id='read-more'
                                            label='Read more'
                                            size='md'
                                        />}
                                    </div>
                                    <div className='space-between relative z-[30] mt-5 flex'>
                                        <FeedItemStats
                                            commentCount={commentCount}
                                            layout={layout}
                                            likeCount={1}
                                            object={object}
                                            onCommentClick={onCommentClick}
                                            onLikeClick={onLikeClick}
                                        />
                                        <Menu items={menuItems} position='end' trigger={UserMenuTrigger}/>
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
                            {(type === 'Announce' && object.type === 'Note') && <div className='z-10 mb-2 flex items-center gap-3 text-grey-700'>
                                <div className='z-10 flex w-10 justify-end'><Icon colorClass='text-grey-700' name='reload' size={'sm'}></Icon></div>
                                <span className='z-10'>{actor.name} reposted</span>
                            </div>}
                            <div className={`z-10 -my-1 grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-3 pb-4 pt-5`} data-test-activity>
                                {(showHeader) && <><div className='relative z-10 pt-[3px]'>
                                    <APAvatar author={author}/>
                                </div>
                                <div className='relative z-10 flex w-full min-w-0 flex-col overflow-visible text-[1.5rem]'>
                                    <div className='flex w-full'>
                                        <span className='min-w-0 truncate whitespace-nowrap font-bold after:mx-1 after:font-normal after:text-grey-700 after:content-["·"]' data-test-activity-heading>{author.name}</span>
                                        <div>{renderTimestamp(object)}</div>
                                    </div>
                                    <div className='flex w-full'>
                                        <span className='min-w-0 truncate text-grey-700'>{getUsername(author)}</span>
                                    </div>
                                </div></>}
                                <div className={`relative z-10 col-start-1 col-end-3 w-full gap-4`}>
                                    <div className='flex flex-col'>
                                        {object.name && <Heading className='mb-1 leading-tight' level={4} data-test-activity-heading>{object.name}</Heading>}
                                        <div dangerouslySetInnerHTML={({__html: object.content})} className='ap-note-content text-pretty text-[1.8rem] text-grey-900'></div>
                                        {renderFeedAttachment(object, layout)}
                                        <div className='space-between mt-5 flex'>
                                            <FeedItemStats
                                                commentCount={commentCount}
                                                layout={layout}
                                                likeCount={1}
                                                object={object}
                                                onCommentClick={onCommentClick}
                                                onLikeClick={onLikeClick}
                                            />
                                            <Menu items={menuItems} position='end' trigger={UserMenuTrigger}/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={`absolute -inset-x-3 -inset-y-0 z-0 rounded transition-colors`}></div>
                        </div>
                        <div className="mt-3 h-px bg-grey-200"></div>
                    </div>

                )}
            </>
        );
    } else if (layout === 'reply') {
        return (
            <>
                {object && (
                    <div className={`group/article relative cursor-pointer py-5`} data-layout='reply' data-object-id={object.id} onClick={onClick}>
                        {(type === 'Announce' && object.type === 'Note') && <div className='z-10 mb-2 flex items-center gap-3 text-grey-700'>
                            <div className='z-10 flex w-10 justify-end'><Icon colorClass='text-grey-700' name='reload' size={'sm'}></Icon></div>
                            <span className='z-10'>{actor.name} reposted</span>
                        </div>}
                        <div className={`border-1 z-10 -my-1 grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-x-3 gap-y-2 border-b-grey-200`} data-test-activity>
                            <div className='relative z-10 min-w-0 pt-[3px]'>
                                <APAvatar author={author}/>
                            </div>
                            <div className='relative z-10 flex w-full min-w-0 flex-col overflow-visible text-[1.5rem]'>
                                <div className='flex'>
                                    <span className='min-w-0 truncate whitespace-nowrap font-bold after:mx-1 after:font-normal after:text-grey-700 after:content-["·"]' data-test-activity-heading>{author.name}</span>
                                    <div>{renderTimestamp(object)}</div>
                                </div>
                                <div className='flex'>
                                    <span className='truncate text-grey-700'>{getUsername(author)}</span>
                                </div>
                            </div>
                            <div className={`relative z-10 col-start-2 col-end-3 w-full gap-4`}>
                                <div className='flex flex-col'>
                                    {(object.type === 'Article') && renderFeedAttachment(object, layout)}
                                    {object.name && <Heading className='my-1 text-pretty leading-tight' level={5} data-test-activity-heading>{object.name}</Heading>}
                                    {(object.preview && object.type === 'Article') ? <div className='line-clamp-3 leading-tight'>{object.preview.content}</div> : <div dangerouslySetInnerHTML={({__html: object.content})} className='ap-note-content text-pretty text-[1.5rem] text-grey-900'></div>}
                                    {(object.type === 'Note') && renderFeedAttachment(object, layout)}
                                    {(object.type === 'Article') && <Button
                                        className={`mt-3 self-start text-grey-900 transition-all hover:opacity-60`}
                                        color='grey'
                                        fullWidth={true}
                                        id='read-more'
                                        label='Read more'
                                        size='md'
                                    />}
                                    <div className='space-between mt-5 flex'>
                                        <FeedItemStats
                                            commentCount={commentCount}
                                            layout={layout}
                                            likeCount={1}
                                            object={object}
                                            onCommentClick={onCommentClick}
                                            onLikeClick={onLikeClick}
                                        />
                                        <Menu items={menuItems} position='end' trigger={UserMenuTrigger}/>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={`absolute -inset-x-3 -inset-y-0 z-0 rounded transition-colors`}></div>
                        {!last && <div className="absolute bottom-0 left-[18px] top-[6.5rem] z-0 mb-[-13px] w-[2px] rounded-sm bg-grey-200"></div>}
                    </div>
                )}
            </>
        );
    } else if (layout === 'inbox') {
        return (
            <>
                {object && (
                    <div className='group/article relative -mx-4 -my-px flex min-h-[112px] min-w-0 cursor-pointer items-center justify-between rounded-md p-4 hover:bg-grey-75' data-layout='inbox' data-object-id={object.id} onClick={onClick}>
                        <div className='flex min-h-[73px] w-full min-w-0 flex-col items-start justify-start'>
                            <div className='z-10 mb-1 flex w-full min-w-0 items-center gap-1.5 text-base text-grey-700 group-hover/article:border-transparent'>
                                <APAvatar author={author} size='2xs'/>
                                <span className='min-w-0 truncate break-all font-medium text-grey-900' data-test-activity-heading>{author.name}</span>
                                <span className='min-w-0 truncate'>{getUsername(author)}</span>
                                <span className='shrink-0 whitespace-nowrap before:mr-1 before:content-["·"]' title={`${timestamp}`}>{getRelativeTimestamp(date)}</span>
                            </div>
                            <Heading className='mb-1 line-clamp-1 w-full max-w-[600px] text-[1.6rem] font-semibold leading-snug' level={5} data-test-activity-heading>
                                {object.name ? object.name : (
                                    <span dangerouslySetInnerHTML={{
                                        __html: stripHtml(object.content)
                                    }}></span>
                                )}
                            </Heading>
                            <div dangerouslySetInnerHTML={({__html: stripHtml(object.content)})} className='ap-note-content w-full max-w-[600px] truncate text-base leading-normal text-grey-700'></div>
                        </div>
                        {renderInboxAttachment(object)}
                        <div className='invisible absolute right-4 top-[9px] z-[49] flex flex-col gap-2 rounded-lg bg-white p-2 shadow-md-heavy group-hover/article:visible'>
                            <FeedItemStats
                                commentCount={commentCount}
                                layout={layout}
                                likeCount={1}
                                object={object}
                                onCommentClick={onCommentClick}
                                onLikeClick={onLikeClick}
                            />
                            <Menu items={menuItems} position='end' trigger={UserMenuTrigger}/>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (<></>);
};

export default FeedItem;
