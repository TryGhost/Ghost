import NewNoteModal from '@components/modals/NewNoteModal';
import React, {useEffect, useRef, useState} from 'react';
import {ActivityPubAPI} from '../../api/activitypub';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {AnimatedNumber, Button, LucideIcon, formatNumber} from '@tryghost/shade';
import {postsActions} from '../../stores/posts-store';
import {toast} from 'sonner';
import {useDerepostMutationForUser, useRepostMutationForUser} from '@hooks/use-activity-pub-queries';
import {useKeyboardShortcuts} from '@hooks/use-keyboard-shortcuts';

// API utilities for Valtio experiment
async function getSiteUrl() {
    const response = await fetch('/ghost/api/admin/site');
    const json = await response.json();
    return json.site.url;
}

function createActivityPubAPI(handle: string, siteUrl: string) {
    return new ActivityPubAPI(
        new URL(siteUrl),
        new URL('/ghost/api/admin/identities/', window.location.origin),
        handle
    );
}

interface FeedItemStatsProps {
    actor: ActorProperties;
    object: ObjectProperties;
    likeCount: number;
    commentCount: number;
    repostCount: number;
    layout: string;
    disabled?: boolean;
    buttonClassName?: string;
    onLikeClick: () => void;
    onCommentClick?: () => void;
    onReplyCountChange?: (increment: number) => void;
}

const FeedItemStats: React.FC<FeedItemStatsProps> = ({
    actor,
    object,
    likeCount,
    commentCount,
    repostCount: initialRepostCount,
    layout,
    disabled = false,
    buttonClassName = '',
    onLikeClick,
    onCommentClick,
    onReplyCountChange
}) => {
    const [isLiked, setIsLiked] = useState(object.liked);
    const [isReposted, setIsReposted] = useState(object.reposted);
    const [showReplyModal, setShowReplyModal] = useState(false);
    const statsRef = useRef<HTMLDivElement>(null);

    useKeyboardShortcuts({
        isReplyAvailable: !onCommentClick && layout !== 'reply',
        onOpenReply: () => setShowReplyModal(true),
        componentRef: statsRef
    });

    useEffect(() => {
        setIsLiked(object.liked);
        setIsReposted(object.reposted);
    }, [object.liked, object.reposted]);

    useEffect(() => {
        setRepostCount(initialRepostCount);
    }, [initialRepostCount]);

    // Keep React Query mutations for repost (not converting yet)
    const repostMutation = useRepostMutationForUser('index');
    const derepostMutation = useDerepostMutationForUser('index');
    const [repostCount, setRepostCount] = useState(initialRepostCount);

    // Valtio experiment: Simple like handling with direct API calls
    const handleLikeClick = async (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();

        const newLikedState = !isLiked;

        // Optimistically update the store immediately
        postsActions.toggleLike(object.id, newLikedState);
        setIsLiked(newLikedState);

        try {
            // Make the API call directly
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI('index', siteUrl);

            if (newLikedState) {
                await api.like(object.id);
                toast.success('Liked');
            } else {
                await api.unlike(object.id);
                toast.success('Unliked');
            }
        } catch (error) {
            // Revert on error
            postsActions.toggleLike(object.id, isLiked);
            setIsLiked(isLiked);
            toast.error('Failed to update like');
        }

        onLikeClick();
    };

    const handleCommentClick = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();

        if (onCommentClick) {
            onCommentClick();
        } else {
            setShowReplyModal(true);
        }
    };

    const buttonClass = `px-2 gap-1.5 font-normal text-md [&_svg]:size-[18px] transition-color ap-action-button text-gray-900 hover:text-gray-900 hover:bg-black/[3%] dark:bg-black dark:hover:bg-gray-950 dark:text-gray-600 ${buttonClassName}`;

    return (
        <>
            <div ref={statsRef} className={`flex ${layout !== 'inbox' && 'gap-1'}`}>
                <Button
                    className={`${buttonClass} ${isLiked && 'text-pink-500 hover:text-pink-500'}`}
                    data-testid="like-button"
                    disabled={disabled}
                    id='like'
                    title={`${isLiked ? 'Undo like' : 'Like'}`}
                    variant='ghost'
                    onClick={(e?: React.MouseEvent<HTMLElement>) => {
                        e?.stopPropagation();
                        if (e) {
                            handleLikeClick(e);
                        }
                    }}
                >
                    <LucideIcon.Heart className={`${isLiked && 'fill-pink-500 text-pink-500'}`} />
                    {layout !== 'inbox' && (
                        <AnimatedNumber
                            className={likeCount === 0 ? '-ml-1.5 w-0 overflow-hidden' : ''}
                            spinTiming={{duration: 300}}
                            value={likeCount}
                        />
                    )}
                </Button>
                <Button
                    className={`${buttonClass}`}
                    data-testid="reply-button"
                    disabled={disabled}
                    id='comment'
                    title='Reply'
                    variant='ghost'
                    onClick={handleCommentClick}
                >
                    <LucideIcon.MessageCircle className='-mr-px' />
                    {(layout !== 'inbox' && commentCount > 0) && formatNumber(commentCount)}
                </Button>
                <Button
                    className={`${buttonClass} ${isReposted && 'text-green-500 hover:text-green-500'}`}
                    data-testid="repost-button"
                    disabled={disabled}
                    id='repost'
                    title={`${isReposted ? 'Undo repost' : 'Repost'}`}
                    variant='ghost'
                    onClick={(e?: React.MouseEvent<HTMLElement>) => {
                        e?.stopPropagation();

                        if (!isReposted) {
                            repostMutation.mutate(object.id, {
                                onError() {
                                    setIsReposted(false);
                                    setRepostCount(repostCount - 1);
                                }
                            });
                            setRepostCount(repostCount + 1);
                        } else {
                            derepostMutation.mutate(object.id);
                            setRepostCount(repostCount - 1);
                        }

                        setIsReposted(!isReposted);
                    }}
                >
                    <LucideIcon.RefreshCw className={`${isReposted && 'text-green-500'}`} />
                    {layout !== 'inbox' && (
                        <AnimatedNumber
                            className={repostCount === 0 ? '-ml-1.5 w-0 overflow-hidden' : ''}
                            spinTiming={{duration: 300}}
                            value={repostCount}
                        />
                    )}
                </Button>
            </div>

            {showReplyModal && (
                <NewNoteModal
                    open={showReplyModal}
                    replyTo={{
                        object: object,
                        actor: actor
                    }}
                    onOpenChange={(open) => {
                        setShowReplyModal(open);
                    }}
                    onReply={() => {
                        onReplyCountChange?.(1);
                        setShowReplyModal(false);
                    }}
                    onReplyError={() => {
                        onReplyCountChange?.(-1);
                    }}
                />
            )}
        </>
    );
};

export default FeedItemStats;
