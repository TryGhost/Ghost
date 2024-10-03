import React, {useState} from 'react';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Heading, Icon, Menu, MenuItem, showToast} from '@tryghost/admin-x-design-system';

import APAvatar from '../global/APAvatar';

import getRelativeTimestamp from '../../utils/get-relative-timestamp';
import getUsername from '../../utils/get-username';
import {type Activity} from '../activities/ActivityItem';
import {useLikeMutationForUser, useUnlikeMutationForUser} from '../../hooks/useActivityPubQueries';

type Attachment = {
    url: string;
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'video/mp4' | 'video/webm' | 'audio/mpeg' | 'audio/ogg' | null;
};

type AttachmentResult = null | Attachment | [Attachment, Attachment, ...Attachment[]]

function toAttachment(value: unknown): Attachment | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'string') {
        return {
            url: value,
            mediaType: null
        };
    }

    if (typeof value !== 'object') {
        return null;
    }

    if ('url' in value && typeof value.url === 'string') {
        return {
            url: value.url,
            mediaType: null
        };
    }

    return null;
}

function getAttachment(object: ObjectProperties): AttachmentResult {
    let attachment: AttachmentResult = null;

    if (object.image) {
        attachment = toAttachment(object.image);
    }

    if (object.type === 'Note' && !attachment) {
        attachment = toAttachment(object.attachment);
    }

    if (!attachment) {
        return null;
    }

    if (Array.isArray(attachment)) {
        if (attachment.length === 0) {
            return null;
        }
        if (attachment.length === 1) {
            return toAttachment(attachment[0]);
        }

        return attachment.map(toAttachment).filter(item => item !== null) as AttachmentResult;
    }

    return toAttachment(attachment);
}

function SingleAttachment({attachment, object}: {attachment: Attachment, object: ObjectProperties}) {
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

function MultipleAttachment({attachments, layout}: {attachments: Attachment[], layout: 'modal' | null}) {
    const attachmentCount = attachments.length;

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
            {attachments.map((item, index) => (
                <img key={item.url} alt={`attachment-${index}`} className={`h-full w-full rounded-md object-cover outline outline-1 -outline-offset-1 outline-black/10 ${attachmentCount === 3 && index === 0 ? 'row-span-2' : ''}`} src={item.url} />
            ))}
        </div>
    );
}

function FeedAttachment({object, layout}: {object: ObjectProperties, layout: 'modal' | null}) {
    const attachment = getAttachment(object);

    if (!attachment) {
        return null;
    }

    if (Array.isArray(attachment)) {
        return <MultipleAttachment attachments={attachment} layout={layout} />;
    }

    return <SingleAttachment attachment={attachment} object={object} />;
}

function SingleInboxAttachment({attachment, object}: {attachment: Attachment, object: ObjectProperties}) {
    switch (attachment.mediaType) {
    case 'image/jpeg':
    case 'image/png':
    case 'image/gif':
        return (
            <div className='min-w-[160px]'>
                <img className={`h-[100px] w-[160px] rounded-md object-cover outline outline-1 -outline-offset-1 outline-black/10`} src={attachment.url} />
            </div>
        );
    case 'video/mp4':
    case 'video/webm':
        return (
            <div className='min-w-[160px]'>
                <div className='relative mb-4 mt-2'>
                    <video className='h-[300px] w-full rounded object-cover' src={attachment.url} controls/>
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
            return <div className='min-w-[160px]'>
                <img className={`h-[100px] w-[160px] rounded-md object-cover outline outline-1 -outline-offset-1 outline-black/10`} src={object.image} />
            </div>;
        }
        return null;
    }
}

function InboxAttachment({object}: {object: ObjectProperties}) {
    const attachment = getAttachment(object);

    if (!attachment) {
        return null;
    }

    if (Array.isArray(attachment)) {
        const attachmentCount = attachment.length;

        return (
            <div className='min-w-[160px]'>
                <div className='relative'>
                    <img className={`h-[100px] w-[160px] rounded-md object-cover`} src={attachment[0].url} />
                    <div className='absolute bottom-1 right-1 z-10 rounded-full border border-[rgba(255,255,255,0.25)] bg-black px-2 py-0.5 font-semibold text-white'>+ {attachmentCount - 1}</div>
                </div>
            </div>
        );
    }

    return <SingleInboxAttachment attachment={attachment} object={object}/>;
}

function getTimestamp(published: Date) {
    const date = published.toLocaleDateString('default', {year: 'numeric', month: 'short', day: '2-digit'});
    const time = published.toLocaleTimeString('default', {hour: '2-digit', minute: '2-digit'});

    const timestamp = `${date}, ${time}`;
    const relativeTimestamp = getRelativeTimestamp(published);

    return {
        timestamp,
        relativeTimestamp
    };
}

function ItemTimestamp({object}: {object: ObjectProperties}) {
    const date = new Date(object?.published ?? new Date());
    const {
        timestamp,
        relativeTimestamp
    } = getTimestamp(date);
    return (
        <a className='whitespace-nowrap text-grey-700 hover:underline' href={object.url} title={timestamp}>{relativeTimestamp}</a>
    );
}

const FeedItemStats: React.FC<{
    object: ObjectProperties;
    likeCount: number;
    commentCount: number;
    onLikeClick: () => void;
    onCommentClick: () => void;
}> = ({object, likeCount, commentCount, onLikeClick, onCommentClick}) => {
    const [isClicked, setIsClicked] = useState(false);
    const [isLiked, setIsLiked] = useState(object.liked);
    const likeMutation = useLikeMutationForUser('index');
    const unlikeMutation = useUnlikeMutationForUser('index');

    const handleLikeClick = async () => {
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

    return (<div className='flex gap-5'>
        <div className='flex gap-1'>
            <Button
                className={`self-start text-grey-900 transition-all hover:opacity-60 ${isClicked ? 'bump' : ''} ${isLiked ? 'ap-red-heart text-red *:!fill-red hover:text-red' : ''}`}
                hideLabel={true}
                icon='heart'
                id='like'
                size='md'
                unstyled={true}
                onClick={(e?: React.MouseEvent<HTMLElement>) => {
                    e?.stopPropagation();
                    handleLikeClick();
                }}
            />
            {isLiked && <span className={`text-grey-900`}>{new Intl.NumberFormat().format(likeCount)}</span>}
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
            {commentCount > 0 && (
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
    comments?: Activity[];
    last?: boolean;
    onClick?: () => void;
    onCommentClick?: () => void;
}

const noop = () => {};

const ItemMenu = ({object}: {object: ObjectProperties}) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopyLink = async () => {
        if (object?.url) { // Check if url is defined
            await navigator.clipboard.writeText(object.url);
            setIsCopied(true);
            showToast({
                title: 'Link copied',
                type: 'success'
            });
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const menuItems: MenuItem[] = [];

    menuItems.push({
        id: 'copy-link',
        label: 'Copy link to post',
        onClick: handleCopyLink
    });

    // TODO: If this is your own Note/Article, you should be able to delete it
    menuItems.push({
        id: 'delete',
        label: 'Delete',
        destructive: true,
        onClick: noop
    });

    const menuButton = (
        <Button
            className={`relative z-10 ml-auto h-5 w-5 self-start ${isCopied ? 'bump' : ''}`}
            hideLabel={true}
            icon='dotdotdot'
            iconColorClass='text-grey-600'
            id='more'
            size='sm'
            unstyled={true}
        />
    );

    return (
        <Menu items={menuItems} position='end' trigger={menuButton}/>
    );
};

function ItemHeading({children}: {children?: string }) {
    if (!children || !children.length) {
        return null;
    }
    return (
        <Heading className='my-1 leading-tight' level={5} data-test-activity-heading>{children[0]}</Heading>
    );
}

function FeedLayoutArticleContent({object}: {object: ObjectProperties}) {
    const content = object.preview ? object.preview.content : <div dangerouslySetInnerHTML={({__html: object.content})} className='ap-note-content text-pretty text-[1.5rem] text-grey-900'></div>;
    return (
        <>
            <FeedAttachment layout={null} object={object} />
            <ItemHeading>
                {object.name}
            </ItemHeading>
            {content}
            <Button
                className={`mt-3 self-start text-grey-900 transition-all hover:opacity-60`}
                color='grey'
                fullWidth={true}
                id='read-more'
                label='Read more'
                size='md'
            />
        </>
    );
}

function FeedLayoutNoteContent({object}: {object: ObjectProperties}) {
    return (
        <>
            <ItemHeading>
                {object.name}
            </ItemHeading>
            <div dangerouslySetInnerHTML={({__html: object.content})} className='ap-note-content text-pretty text-[1.5rem] text-grey-900'></div>
            <FeedAttachment layout={null} object={object} />
        </>
    );
}

function FeedLayoutContent({object}: {object: ObjectProperties}) {
    if (object.type === 'Article') {
        return <FeedLayoutArticleContent object={object} />;
    }
    if (object.type === 'Note') {
        return <FeedLayoutNoteContent object={object} />;
    }
}

interface LayoutProps {
    author: ActorProperties;
    actor: ActorProperties;
    object: ObjectProperties;
    type: string;
    comments?: Activity[];
    last?: boolean;
    onClick?: () => void;
    onCommentClick: () => void;
}

const FeedLayout = ({actor, object, type, comments = [], onClick = noop, onCommentClick, author}: LayoutProps) => {
    const onLikeClick = () => {};
    return (
        <div className={`group/article relative cursor-pointer pt-6`} onClick={onClick}>
            {(type === 'Announce' && object.type === 'Note') && <div className='z-10 mb-2 flex items-center gap-3 text-grey-700'>
                <div className='z-10 flex w-10 justify-end'><Icon colorClass='text-grey-700' name='reload' size={'sm'}></Icon></div>
                <span className='z-10'>{actor.name} reposted</span>
            </div>}
            <div className={`border-1 z-10 -my-1 grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-x-3 gap-y-2 border-b-grey-200 pb-6`} data-test-activity>
                <APAvatar author={author}/>
                <div className='flex justify-between'>
                    <div className='relative z-10 flex w-full flex-col overflow-visible text-[1.5rem]'>
                        <div className='flex justify-between'>
                            <div className='flex'>
                                <span className='truncate whitespace-nowrap font-bold' data-test-activity-heading>{author.name}</span>
                                <span className='ml-1 truncate text-grey-700'>{getUsername(author)}</span>
                            </div>
                            <ItemTimestamp object={object}/>
                        </div>
                    </div>
                </div>
                <div className={`relative z-10 col-start-2 col-end-3 w-full gap-4`}>
                    <div className='flex flex-col'>
                        <div className='mt-[-24px]'>
                            <FeedLayoutContent object={object}/>
                        </div>
                        <div className='space-between mt-5 flex'>
                            <FeedItemStats
                                commentCount={comments.length}
                                likeCount={1}
                                object={object}
                                onCommentClick={onCommentClick}
                                onLikeClick={onLikeClick}
                            />
                            <ItemMenu object={object}/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ModalLayout = ({actor, object, type, comments = [], onClick = noop, onCommentClick, author}: LayoutProps) => {
    const onLikeClick = () => {};
    return (
        <div>
            <div className={`group/article relative cursor-pointer`} onClick={onClick}>
                {(type === 'Announce' && object.type === 'Note') && <div className='z-10 mb-2 flex items-center gap-3 text-grey-700'>
                    <div className='z-10 flex w-10 justify-end'><Icon colorClass='text-grey-700' name='reload' size={'sm'}></Icon></div>
                    <span className='z-10'>{actor.name} reposted</span>
                </div>}
                <div className={`z-10 -my-1 grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-3 pb-4`} data-test-activity>
                    <div className='relative z-10 pt-[3px]'>
                        <APAvatar author={author}/>
                    </div>
                    <div className='relative z-10 flex w-full flex-col overflow-visible text-[1.5rem]'>
                        <div className='flex'>
                            <span className='truncate whitespace-nowrap font-bold after:mx-1 after:font-normal after:text-grey-700 after:content-["·"]' data-test-activity-heading>{author.name}</span>
                            <ItemTimestamp object={object}/>
                        </div>
                        <div className='flex'>
                            <span className='truncate text-grey-700'>{getUsername(author)}</span>
                        </div>
                    </div>
                    <div className={`relative z-10 col-start-1 col-end-3 w-full gap-4`}>
                        <div className='flex flex-col'>
                            {object.name && <Heading className='mb-1 leading-tight' level={4} data-test-activity-heading>{object.name}</Heading>}
                            <div dangerouslySetInnerHTML={({__html: object.content})} className='ap-note-content text-pretty text-[1.7rem] text-grey-900'></div>
                            <FeedAttachment layout="modal" object={object}/>
                            <div className='space-between mt-5 flex'>
                                <FeedItemStats
                                    commentCount={comments.length}
                                    likeCount={1}
                                    object={object}
                                    onCommentClick={onCommentClick}
                                    onLikeClick={onLikeClick}
                                />
                                <ItemMenu object={object}/>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={`absolute -inset-x-3 -inset-y-0 z-0 rounded transition-colors`}></div>
            </div>
            <div className="mt-3 h-px bg-grey-200"></div>
        </div>
    );
};

const ReplyLayout = ({actor, object, type, comments = [], onClick = noop, onCommentClick, author, last}: LayoutProps) => {
    const onLikeClick = () => {};
    return (
        <div className={`group/article relative cursor-pointer py-5`} onClick={onClick}>
            {(type === 'Announce' && object.type === 'Note') && <div className='z-10 mb-2 flex items-center gap-3 text-grey-700'>
                <div className='z-10 flex w-10 justify-end'><Icon colorClass='text-grey-700' name='reload' size={'sm'}></Icon></div>
                <span className='z-10'>{actor.name} reposted</span>
            </div>}
            <div className={`border-1 z-10 -my-1 grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-x-3 gap-y-2 border-b-grey-200`} data-test-activity>
                <div className='relative z-10 pt-[3px]'>
                    <APAvatar author={author}/>
                </div>
                <div className='relative z-10 flex w-full flex-col overflow-visible text-[1.5rem]'>
                    <div className='flex'>
                        <span className='truncate whitespace-nowrap font-bold after:mx-1 after:font-normal after:text-grey-700 after:content-["·"]' data-test-activity-heading>{author.name}</span>
                        <ItemTimestamp object={object}/>
                    </div>
                    <div className='flex'>
                        <span className='truncate text-grey-700'>{getUsername(author)}</span>
                    </div>
                </div>
                <div className={`relative z-10 col-start-2 col-end-3 w-full gap-4`}>
                    <div className='flex flex-col'>
                        {object.name && <Heading className='mb-1 leading-tight' level={4} data-test-activity-heading>{object.name}</Heading>}
                        <div dangerouslySetInnerHTML={({__html: object.content})} className='ap-note-content text-pretty text-[1.5rem] text-grey-900'></div>
                        <FeedAttachment layout={null} object={object}/>
                        <div className='space-between mt-5 flex'>
                            <FeedItemStats
                                commentCount={comments.length}
                                likeCount={1}
                                object={object}
                                onCommentClick={onCommentClick}
                                onLikeClick={onLikeClick}
                            />
                            <ItemMenu object={object}/>
                        </div>
                    </div>
                </div>
            </div>
            <div className={`absolute -inset-x-3 -inset-y-0 z-0 rounded transition-colors`}></div>
            {!last && <div className="absolute bottom-0 left-[18px] top-[6.5rem] z-0 mb-[-13px] w-[2px] rounded-sm bg-grey-200"></div>}
        </div>
    );
};

const InboxLayout = ({object, comments = [], onClick = noop, onCommentClick, author}: LayoutProps) => {
    const onLikeClick = () => {};

    const date = new Date(object?.published ?? new Date());
    const {
        timestamp,
        relativeTimestamp
    } = getTimestamp(date);
    return (
        <div className='group/article relative -mx-4 -mt-px cursor-pointer rounded-md px-4 hover:bg-grey-75' onClick={onClick}>
            <div className='z-10 flex items-start gap-3 py-4 group-hover/article:border-transparent'>
                <APAvatar author={author} size='xs'/>
                <div className='z-10 w-full'>
                    <div className='mb-1'>
                        <span className='truncate whitespace-nowrap font-semibold' data-test-activity-heading>{author.name}</span>
                        <span className='truncate text-grey-700'>&nbsp;{getUsername(author)}</span>
                        <span className='whitespace-nowrap text-grey-700 before:mx-1 before:content-["·"]' title={timestamp}>{relativeTimestamp}</span>
                    </div>
                    <div className='flex w-full items-start justify-between gap-5'>
                        <div className='grow'>
                            {object.name && <Heading className='leading-tight' level={5} data-test-activity-heading>{object.name}</Heading>}
                            <div dangerouslySetInnerHTML={({__html: object.content})} className='ap-note-content mt-1 line-clamp-3 text-pretty text-[1.5rem] text-grey-900'></div>
                        </div>
                        <InboxAttachment object={object}/>
                    </div>
                    <div className='space-between mt-5 flex'>
                        <FeedItemStats
                            commentCount={comments.length}
                            likeCount={1}
                            object={object}
                            onCommentClick={onCommentClick}
                            onLikeClick={onLikeClick}
                        />
                        <ItemMenu object={object}/>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FeedItem: React.FC<FeedItemProps> = ({actor, object, layout, type, comments = [], last, onClick = noop, onCommentClick = noop}) => {
    if (!object) {
        return null;
    }

    let author = actor;
    if (type === 'Announce' && object.type === 'Note') {
        author = typeof object.attributedTo === 'object' ? object.attributedTo as ActorProperties : actor;
    }

    if (layout === 'feed') {
        return <FeedLayout
            actor={actor}
            author={author}
            comments={comments}
            object={object}
            type={type}
            onClick={onClick}
            onCommentClick={onCommentClick}
        />;
    } else if (layout === 'modal') {
        return <ModalLayout
            actor={actor}
            author={author}
            comments={comments}
            object={object}
            type={type}
            onClick={onClick}
            onCommentClick={onCommentClick}
        />;
    } else if (layout === 'reply') {
        return <ReplyLayout
            actor={actor}
            author={author}
            comments={comments}
            last={last}
            object={object}
            type={type}
            onClick={onClick}
            onCommentClick={onCommentClick}
        />;
    } else if (layout === 'inbox') {
        return <InboxLayout
            actor={actor}
            author={author}
            comments={comments}
            object={object}
            type={type}
            onClick={onClick}
            onCommentClick={onCommentClick}
        />;
    }

    return (<></>);
};

export default FeedItem;
