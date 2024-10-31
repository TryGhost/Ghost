import React, {useState} from 'react';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Heading, Icon, Menu, MenuItem, showToast} from '@tryghost/admin-x-design-system';

import APAvatar from '../global/APAvatar';

import getRelativeTimestamp from '../../utils/get-relative-timestamp';
import getUsername from '../../utils/get-username';
import stripHtml from '../../utils/strip-html';
import {useLikeMutationForUser, useUnlikeMutationForUser} from '../../hooks/useActivityPubQueries';

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
            return <img alt='attachment' className='my-3 max-h-[280px] w-full rounded-md object-cover outline outline-1 -outline-offset-1 outline-black/10' src={object.image} />;
        }
        return null;
    }
}

function renderInboxAttachment(object: ObjectProperties) {
    const attachment = getAttachment(object);

    if (!attachment) {
        return null;
    }

    if (Array.isArray(attachment)) {
        const attachmentCount = attachment.length;

        return (
            <div className='min-w-[120px]'>
                <div className='relative'>
                    <img className={`h-[80px] w-[120px] rounded-md object-cover outline outline-1 -outline-offset-1 outline-black/10`} src={attachment[0].url} />
                    <div className='absolute bottom-1 right-1 z-10 rounded-full border border-[rgba(255,255,255,0.25)] bg-black px-2 py-0.5 font-semibold text-white'>+ {attachmentCount - 1}</div>
                </div>
            </div>
        );
    }

    switch (attachment.mediaType) {
    case 'image/jpeg':
    case 'image/png':
    case 'image/gif':
        return (
            <div className='min-w-[120px]'>
                <img className={`h-[80px] w-[120px] rounded-md object-cover outline outline-1 -outline-offset-1 outline-black/10`} src={attachment.url} />
            </div>
        );
    case 'video/mp4':
    case 'video/webm':
        return (
            <div className='relative h-[80px]'>
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
            <div className='min-w-[160px]'>
                <div className='relative mb-4 mt-2 w-full'>
                    <audio className='w-full' src={attachment.url} controls/>
                </div>
            </div>
        );
    default:
        if (object.image) {
            return <div className='min-h-[80px]'>
                <img className={`h-[80px] w-[120px] rounded-md object-cover outline outline-1 -outline-offset-1 outline-black/10`} src={object.image} />
            </div>;
        }
        return null;
    }
}

function renderTimestamp(object: ObjectProperties) {
    const timestamp =
        new Date(object?.published ?? new Date()).toLocaleDateString('default', {year: 'numeric', month: 'short', day: '2-digit'}) + ', ' + new Date(object?.published ?? new Date()).toLocaleTimeString('default', {hour: '2-digit', minute: '2-digit'});

    const date = new Date(object?.published ?? new Date());
    return (<a className='whitespace-nowrap text-grey-700 hover:underline' href={object.url} title={`${timestamp}`}>{getRelativeTimestamp(date)}</a>);
}

const FeedItemStats: React.FC<{
    object: ObjectProperties;
    likeCount: number;
    commentCount: number;
    layout: string;
    onLikeClick: () => void;
    onCommentClick: () => void;
}> = ({object, likeCount, commentCount, layout, onLikeClick, onCommentClick}) => {
    const [isClicked, setIsClicked] = useState(false);
    const [isLiked, setIsLiked] = useState(object.liked);
    const likeMutation = useLikeMutationForUser('index');
    const unlikeMutation = useUnlikeMutationForUser('index');

    const handleLikeClick = async (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setIsClicked(true);
        if (!isLiked) {
            likeMutation.mutate(object.id);
        } else {
            unlikeMutation.mutate(object.id);
        }

        setIsLiked(!isLiked);

        onLikeClick();
        setTimeout(() => setIsClicked(false), 300);
    };

    return (<div className={`flex ${(layout === 'inbox') ? 'flex-col gap-2' : 'gap-5'}`}>
        <div className='flex gap-1'>
            <Button
                className={`self-start text-grey-900 transition-opacity hover:opacity-60 ${isClicked ? 'bump' : ''} ${isLiked ? 'ap-red-heart text-red *:!fill-red hover:text-red' : ''}`}
                hideLabel={true}
                icon='heart'
                id='like'
                size='md'
                unstyled={true}
                onClick={(e?: React.MouseEvent<HTMLElement>) => {
                    e?.stopPropagation();
                    if (e) {
                        handleLikeClick(e);
                    }
                }}
            />
            {isLiked && (layout !== 'inbox') && <span className={`text-grey-900`}>{new Intl.NumberFormat().format(likeCount)}</span>}
        </div>
        <div className='flex gap-1'>
            <Button
                className={`self-start text-grey-900 hover:opacity-60 ${isClicked ? 'bump' : ''}`}
                hideLabel={true}
                icon='comment'
                id='comment'
                size='md'
                unstyled={true}
                onClick={(e?: React.MouseEvent<HTMLElement>) => {
                    e?.stopPropagation();
                    onCommentClick();
                }}
            />
            {commentCount > 0 && (layout !== 'inbox') && (
                <span className={`text-grey-900`}>{new Intl.NumberFormat().format(commentCount)}</span>
            )}
        </div>
    </div>);
};

interface FeedItemProps {
    actor: ActorProperties;
    object: ObjectProperties;
    layout: string;
    type: string;
    commentCount?: number;
    last?: boolean;
    onClick?: () => void;
    onCommentClick: () => void;
}

const noop = () => {};

const FeedItem: React.FC<FeedItemProps> = ({actor, object, layout, type, commentCount = 0, last, onClick = noop, onCommentClick}) => {
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
                                        {object.name && <Heading className='my-1 leading-tight' level={5} data-test-activity-heading>{object.name}</Heading>}
                                        {(object.preview && object.type === 'Article') ? object.preview.content : <div dangerouslySetInnerHTML={({__html: object.content})} className='ap-note-content text-pretty text-[1.5rem] text-grey-900'></div>}
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
                                <div className='relative z-10 pt-[3px]'>
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
                                </div>
                                <div className={`relative z-10 col-start-1 col-end-3 w-full gap-4`}>
                                    <div className='flex flex-col'>
                                        {object.name && <Heading className='mb-1 leading-tight' level={4} data-test-activity-heading>{object.name}</Heading>}
                                        <div dangerouslySetInnerHTML={({__html: object.content})} className='ap-note-content text-pretty text-[1.7rem] text-grey-900'></div>
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
                                    {object.name && <Heading className='mb-1 leading-tight' level={4} data-test-activity-heading>{object.name}</Heading>}
                                    <div dangerouslySetInnerHTML={({__html: object.content})} className='ap-note-content text-pretty text-[1.5rem] text-grey-900'></div>
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
                        {!last && <div className="absolute bottom-0 left-[18px] top-[6.5rem] z-0 mb-[-13px] w-[2px] rounded-sm bg-grey-200"></div>}
                    </div>
                )}
            </>
        );
    } else if (layout === 'inbox') {
        return (
            <>
                {object && (
                    <div className='group/article relative -mx-4 -my-px flex min-w-0 cursor-pointer justify-between rounded-md p-4 hover:bg-grey-75' data-layout='inbox' data-object-id={object.id} onClick={onClick}>
                        <div className='flex w-full min-w-0 flex-col items-start justify-between gap-1 pr-4'>
                            <div className='z-10 flex w-full min-w-0 items-start gap-2 group-hover/article:border-transparent'>
                                <APAvatar author={author} size='xs'/>
                                <span className='min-w-0 truncate break-all font-semibold' data-test-activity-heading>{author.name}</span>
                                <span className='min-w-0 truncate text-grey-700'>{getUsername(author)}</span>
                                {/* <div className='flex gap-2'>
                                    <span className='truncate min-w-0 break-all font-semibold' data-test-activity-heading>{author.name}</span>
                                    <span className='min-w-0 truncate text-grey-700'>{getUsername(author)}</span>
                                </div> */}
                                <span className='shrink-0 whitespace-nowrap text-grey-700 before:mr-1 before:content-["·"]' title={`${timestamp}`}>{getRelativeTimestamp(date)}</span>
                            </div>
                            <Heading className='line-clamp-1 font-semibold leading-normal' level={5} data-test-activity-heading>
                                {object.name ? object.name : (
                                    <span dangerouslySetInnerHTML={{
                                        __html: object.content.length > 30
                                            ? stripHtml(object.content).substring(0, 50) + '...'
                                            : stripHtml(object.content)
                                    }}></span>
                                )}
                            </Heading>
                            <div dangerouslySetInnerHTML={({__html: stripHtml(object.content)})} className='ap-note-content w-full truncate text-[1.5rem] text-grey-700'></div>
                        </div>
                        {renderInboxAttachment(object)}
                        <div className='invisible absolute right-2 top-[9px] z-[49] flex flex-col gap-2 rounded-lg bg-white p-2 shadow-md-heavy group-hover/article:visible'>
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
