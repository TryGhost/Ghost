import React from 'react';
import {LucideIcon, Skeleton} from '@tryghost/shade';
import {ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';

export function getAttachment(object: ObjectProperties) {
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

interface FeedItemAttachmentProps {
    object: ObjectProperties;
    layout?: 'feed' | 'modal' | 'reply' | 'inbox';
    onImageClick?: (url: string) => void;
    brokenImages?: Set<string>;
    onImageError?: (url: string) => void;
    isLoading?: boolean;
}

export const FeedItemAttachment: React.FC<FeedItemAttachmentProps> = ({
    object,
    layout = 'feed',
    onImageClick,
    brokenImages,
    onImageError,
    isLoading = false
}) => {
    if (layout === 'inbox') {
        return <InboxAttachment isLoading={isLoading} object={object} />;
    }

    return renderFeedAttachment(object, onImageClick, brokenImages, onImageError);
};

function renderImagePlaceholder(className: string, isSingleImage: boolean = false) {
    const minHeight = isSingleImage ? 'min-h-[200px]' : '';
    return (
        <div className={`${className} ${minHeight} flex w-full items-center justify-center bg-gray-100 dark:bg-gray-925/30`}>
            <LucideIcon.ImageOff className="text-gray-400" size={24} strokeWidth={1.5} />
        </div>
    );
}

export function renderFeedAttachment(
    object: ObjectProperties,
    onImageClick?: (url: string) => void,
    brokenImages?: Set<string>,
    onImageError?: (url: string) => void
) {
    const attachment = getAttachment(object);

    if (!attachment) {
        return null;
    }

    const handleImageClick = (url: string) => (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onImageClick) {
            onImageClick(url);
        }
    };

    const handleImageError = (url: string) => {
        if (onImageError) {
            onImageError(url);
        }
    };

    if (Array.isArray(attachment)) {
        const attachmentCount = attachment.length;

        let gridClass = '';
        if (attachmentCount === 1) {
            gridClass = 'grid-cols-1';
        } else if (attachmentCount >= 2 && attachmentCount <= 4) {
            gridClass = 'grid-cols-2 auto-rows-[150px]';
        } else if (attachmentCount > 4) {
            gridClass = 'grid-cols-3 auto-rows-[150px]';
        }

        return (
            <div className={`attachment-gallery mt-3 grid w-full ${gridClass} gap-2`}>
                {attachment.map((item, index) => {
                    const imageClassName = `size-full rounded-md outline outline-1 -outline-offset-1 outline-black/10 ${attachmentCount === 3 && index === 0 ? 'row-span-2' : ''}`;

                    if (brokenImages && brokenImages.has(item.url)) {
                        return (
                            <React.Fragment key={item.url}>
                                renderImagePlaceholder(imageClassName, attachmentCount === 1);
                            </React.Fragment>
                        );
                    }

                    return (
                        <img
                            key={item.url}
                            alt={item.name || `Image-${index}`}
                            className={`${imageClassName} cursor-pointer object-cover`}
                            referrerPolicy='no-referrer'
                            src={item.url}
                            onClick={onImageClick ? handleImageClick(item.url) : undefined}
                            onError={() => handleImageError(item.url)}
                        />
                    );
                })}
            </div>
        );
    }

    switch (attachment.mediaType) {
    case 'image/jpeg':
    case 'image/png':
    case 'image/gif':
    case 'image/webp':
        if (brokenImages && brokenImages.has(attachment.url)) {
            return renderImagePlaceholder(`${object.type === 'Article' ? 'w-full rounded-t-md' : 'mt-3 max-h-[420px] rounded-md outline outline-1 -outline-offset-1 outline-black/10'}`, true);
        }
        return <img alt={attachment.name || 'Image'} className={`cursor-pointer ${object.type === 'Article' ? 'w-full rounded-t-md' : 'mt-3 max-h-[420px] rounded-md outline outline-1 -outline-offset-1 outline-black/10'}`} referrerPolicy='no-referrer' src={attachment.url} onClick={onImageClick ? handleImageClick(attachment.url) : undefined} onError={() => handleImageError(attachment.url)} />;
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
                ? 'cursor-pointer aspect-[16/7.55] w-full rounded-t-md object-cover'
                : 'cursor-pointer mt-3 max-h-[420px] rounded-md outline outline-1 -outline-offset-1 outline-black/10';

            let imageUrl;
            if (!object.image) {
                imageUrl = attachment.url;
            } else if (typeof object.image === 'string') {
                imageUrl = object.image;
            } else {
                imageUrl = object.image?.url;
            }

            if (brokenImages && brokenImages.has(imageUrl)) {
                return renderImagePlaceholder(imageClassName, true);
            }

            return (
                <img
                    alt={attachment.name || 'Image'}
                    className={imageClassName}
                    referrerPolicy='no-referrer'
                    src={imageUrl}
                    onClick={onImageClick ? handleImageClick(imageUrl) : undefined}
                    onError={() => handleImageError(imageUrl)}
                />
            );
        }
        return null;
    }
}

function InboxAttachment({object, isLoading}: {object: ObjectProperties; isLoading?: boolean}) {
    const attachment = getAttachment(object);

    const videoAttachmentStyles = 'ml-8 md:ml-9 shrink-0 rounded-md h-[91px] w-[121px] relative';
    const imageAttachmentStyles = `object-cover outline outline-1 -outline-offset-1 outline-black/[0.05] ${videoAttachmentStyles}`;

    if (isLoading) {
        return <Skeleton className={`${imageAttachmentStyles} outline-0`} />;
    }

    if (!attachment) {
        return null;
    }

    if (Array.isArray(attachment)) {
        return (
            <img className={imageAttachmentStyles} referrerPolicy='no-referrer' src={attachment[0].url} />
        );
    }

    switch (attachment.mediaType) {
    case 'image/jpeg':
    case 'image/png':
    case 'image/gif':
        return (
            <img className={imageAttachmentStyles} referrerPolicy='no-referrer' src={attachment.url} />
        );
    case 'video/mp4':
    case 'video/webm':
        return (
            <div className={videoAttachmentStyles}>
                <video className='h-[80px] w-full rounded object-cover' src={attachment.url} />
                <div className='absolute inset-0 rounded bg-gray-900 opacity-50'></div>
                <div className='absolute inset-0 flex items-center justify-center'>
                    <LucideIcon.Play color='white' fill='white' size={40} />
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
            return <img className={imageAttachmentStyles} referrerPolicy='no-referrer' src={typeof object.image === 'string' ? object.image : object.image?.url} />;
        }
        return null;
    }
}
