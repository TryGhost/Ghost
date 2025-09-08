import React, {useState} from 'react';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';

import FeedLayout from './layouts/FeedLayout';
import InboxLayout from './layouts/InboxLayout';
import ModalLayout from './layouts/ModalLayout';
import ReplyLayout from './layouts/ReplyLayout';

import ImageLightbox, {useLightboxImages} from '../global/ImageLightbox';

interface FeedItemProps {
    actor: ActorProperties;
    allowDelete?: boolean;
    object: ObjectProperties;
    parentId?: string;
    layout: string;
    type: string;
    commentCount?: number;
    repostCount?: number;
    likeCount?: number;
    showHeader?: boolean;
    last?: boolean;
    isLoading?: boolean;
    isPending?: boolean;
    isCompact?: boolean;
    isChainContinuation?: boolean;
    isChainParent?: boolean;
    onClick?: () => void;
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
    likeCount = 0,
    showHeader = true,
    last,
    isLoading,
    isPending = false,
    isCompact = false,
    isChainContinuation = false,
    isChainParent = false,
    onClick: onClickHandler = noop,
    onDelete = noop,
    showStats = true
}) => {
    const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

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

    const handleImageError = (url: string) => {
        setBrokenImages(prev => new Set(prev).add(url));
    };

    let author = actor;
    if (type === 'Announce') {
        author = typeof object.attributedTo === 'object' ? object.attributedTo as ActorProperties : actor;
    }

    const followedByMe = type === 'Announce'
        ? (typeof object.attributedTo === 'object' && object.attributedTo && !Array.isArray(object.attributedTo) && 'followedByMe' in object.attributedTo ? object.attributedTo.followedByMe : false)
        : (actor?.followedByMe || false);

    const isAuthorCurrentUser = type === 'Announce'
        ? (typeof object.attributedTo === 'object' && object.attributedTo && !Array.isArray(object.attributedTo) && 'authored' in object.attributedTo
            ? (object.attributedTo as {authored: boolean}).authored
            : (typeof object.attributedTo === 'object' && object.attributedTo && !Array.isArray(object.attributedTo) &&
               typeof actor === 'object' && actor &&
               (object.attributedTo as {id: string}).id === actor.id))
        : object.authored;

    const {
        lightboxState,
        openLightbox,
        closeLightbox,
        navigateToIndex
    } = useLightboxImages(object);

    if (!object) {
        return null;
    }

    const layoutProps = {
        actor,
        author,
        allowDelete,
        object,
        parentId,
        type,
        commentCount,
        repostCount,
        likeCount,
        isLoading,
        isPending,
        isCompact,
        isAuthorCurrentUser,
        followedByMe,
        brokenImages,
        onImageClick: openLightbox,
        onImageError: handleImageError,
        onClick,
        onDelete,
        onLikeClick,
        showStats
    };

    return (
        <>
            {layout === 'feed' && (
                <FeedLayout {...layoutProps} />
            )}
            {layout === 'modal' && (
                <ModalLayout {...layoutProps} showHeader={showHeader} />
            )}
            {layout === 'reply' && (
                <ReplyLayout
                    {...layoutProps}
                    isChainContinuation={isChainContinuation}
                    isChainParent={isChainParent}
                    last={last}
                />
            )}
            {layout === 'inbox' && (
                <InboxLayout {...layoutProps} />
            )}
            <ImageLightbox
                currentIndex={lightboxState.currentIndex}
                images={lightboxState.images}
                isOpen={lightboxState.isOpen}
                onClose={closeLightbox}
                onNavigate={navigateToIndex}
            />
        </>
    );
};

export default FeedItem;
