import APAvatar from '@src/components/global/APAvatar';
import APReplyBox from '@src/components/global/APReplyBox';
import DeletedFeedItem from '@src/components/feed/DeletedFeedItem';
import FeedItem from '@components/feed/FeedItem';
import Layout from '@src/components/layout/Layout';
import React, {useEffect, useRef, useState} from 'react';
import ShowRepliesButton from '@src/components/global/ShowRepliesButton';
import getUsername from '@src/utils/get-username';
import {Activity} from '@tryghost/admin-x-framework/api/activitypub';
import {EmptyViewIcon, EmptyViewIndicator} from '@src/components/global/EmptyViewIndicator';
import {LoadingIndicator, LucideIcon, Skeleton} from '@tryghost/shade';
import {handleProfileClick} from '@src/utils/handle-profile-click';
import {isPendingActivity} from '@src/utils/pending-activity';
import {renderTimestamp} from '@src/utils/render-timestamp';
import {useNavigate, useNavigationStack, useParams} from '@tryghost/admin-x-framework';
import {useReplyChainData} from '@hooks/use-reply-chain-data';

const FeedItemDivider: React.FC = () => (
    <div className="h-px w-full bg-gray-200 dark:bg-gray-950"></div>
);

const Note = () => {
    const {postId} = useParams();
    const {canGoBack} = useNavigationStack();

    const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set());
    const [fullyExpandedChains, setFullyExpandedChains] = useState<Set<string>>(new Set());
    const [loadingChains, setLoadingChains] = useState<Set<string>>(new Set());
    const [isLoadingMoreTopLevelReplies, setIsLoadingMoreTopLevelReplies] = useState(false);
    const repliesRef = useRef<HTMLDivElement>(null);
    const postRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const navigate = useNavigate();

    const {
        threadParents,
        post: currentPost,
        processedReplies,
        isLoading,
        loadMoreChildren,
        loadMoreChildReplies,
        hasMoreChildren,
        hasMoreChildReplies
    } = useReplyChainData(decodeURIComponent(postId ?? ''), {includeAncestors: true});

    const object = currentPost?.object;

    const [replyCount, setReplyCount] = useState(object?.replyCount ?? 0);
    const [hasScrolledToPost, setHasScrolledToPost] = useState(false);

    useEffect(() => {
        if (object?.replyCount !== undefined) {
            setReplyCount(object.replyCount);
        }
    }, [object?.replyCount]);

    useEffect(() => {
        if (postRef.current && threadParents.length > 0 && !hasScrolledToPost) {
            postRef.current.scrollIntoView({
                behavior: 'instant',
                block: 'start'
            });
            setHasScrolledToPost(true);
        }
    }, [threadParents, hasScrolledToPost]);

    useEffect(() => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        const container = document.querySelector('[data-scrollable-container]') as HTMLElement;
        if (!container) {
            return;
        }

        observerRef.current = new IntersectionObserver(async (entries) => {
            if (entries[0].isIntersecting && hasMoreChildren && !isLoadingMoreTopLevelReplies) {
                setIsLoadingMoreTopLevelReplies(true);
                try {
                    await loadMoreChildren();
                } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error('Failed to load more top-level replies:', error);
                } finally {
                    setIsLoadingMoreTopLevelReplies(false);
                }
            }
        }, {
            root: container,
            rootMargin: '200px'
        });

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasMoreChildren, isLoadingMoreTopLevelReplies, loadMoreChildren]);

    if (isLoading) {
        return (
            <Layout>
                <div className='mx-auto flex max-w-[620px] flex-col items-center gap-3 pt-9 lg:px-8'>
                    <div className='flex w-full items-center gap-3'>
                        <Skeleton className='size-10 rounded-full' />
                        <div className='grow pt-1'>
                            <Skeleton className='w-24' />
                            <Skeleton className='w-3/5' />
                        </div>
                    </div>
                    <div className='mb-7 w-full'>
                        <Skeleton />
                        <Skeleton className='w-4/5' />
                        <Skeleton />
                    </div>
                    <FeedItemDivider />
                    <div className='flex w-full items-center gap-3 py-3'>
                        <Skeleton className='block size-full' containerClassName='size-10 rounded-full overflow-hidden' />
                        <div>
                            <Skeleton className='w-52' />
                            <Skeleton className='w-28' />
                        </div>
                    </div>
                    <FeedItemDivider />
                </div>
            </Layout>
        );
    }

    if (!currentPost) {
        return (
            <Layout>
                <div className='mx-auto mt-4 flex w-full max-w-[620px] flex-col items-center'>
                    <EmptyViewIndicator>
                        <EmptyViewIcon><LucideIcon.Hash /></EmptyViewIcon>
                        <div>Error loading note.</div>
                    </EmptyViewIndicator>
                </div>
            </Layout>
        );
    }

    function handleReplyCountChange(increment: number) {
        setReplyCount((current: number) => current + increment);
    }

    function handleDelete() {
        handleReplyCountChange(-1);
    }

    function toggleChain(chainId: string) {
        setExpandedChains((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(chainId)) {
                newSet.delete(chainId);
            } else {
                newSet.add(chainId);
                setFullyExpandedChains((fullyExpanded) => {
                    const newFullyExpanded = new Set(fullyExpanded);
                    newFullyExpanded.add(chainId);
                    return newFullyExpanded;
                });
            }
            return newSet;
        });
    }

    async function loadMoreForChain(chainId: string, childIndex: number) {
        if (loadingChains.has(chainId)) {
            return;
        }

        setLoadingChains(prev => new Set(prev).add(chainId));

        try {
            if (loadMoreChildReplies) {
                await loadMoreChildReplies(childIndex);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to load more replies for chain:', error);
        } finally {
            setLoadingChains((prev) => {
                const newSet = new Set(prev);
                newSet.delete(chainId);
                return newSet;
            });
        }
    }

    return (
        <Layout>
            <div className='mx-auto flex h-full max-w-[620px] flex-col'>
                <div className='relative flex-1'>
                    <div className='grow overflow-y-auto'>
                        <div className={`mx-auto px-8 pb-10 pt-5 max-lg:px-0`}>
                            {!threadParents.length &&
                            <div className={`col-[2/3] mx-auto flex w-full items-center gap-3 ${canGoBack ? 'pt-10 max-md:pt-5' : 'pt-5'}`}>
                                <div className='relative z-10'>
                                    <APAvatar author={currentPost.actor} showFollowButton={!currentPost.object.authored && !currentPost.actor.followedByMe}/>
                                </div>
                                <div className='relative z-10 flex w-full min-w-0 cursor-pointer flex-col overflow-visible text-[1.5rem]' onClick={(e) => {
                                    handleProfileClick(currentPost.actor, navigate, e);
                                }}>
                                    <div className='flex w-full'>
                                        <span className='min-w-0 truncate whitespace-nowrap font-semibold hover:underline'>{currentPost.actor.name}</span>
                                    </div>
                                    <div className='flex w-full'>
                                        <span className='truncate text-gray-700 after:mx-1 after:font-normal after:text-gray-700 after:content-["·"]'>{getUsername(currentPost.actor)}</span>
                                        <span className='text-gray-700'>{renderTimestamp(object, !object.authored)}</span>
                                    </div>
                                </div>
                            </div>
                            }

                            {threadParents.map((item) => {
                                return (
                                    item.object.type === 'Tombstone' ? (
                                        <DeletedFeedItem last={false} />
                                    ) : (
                                        <FeedItem
                                            actor={item.actor}
                                            allowDelete={false}
                                            commentCount={item.object.replyCount ?? 0}
                                            last={false}
                                            layout='reply'
                                            likeCount={item.object.likeCount ?? 0}
                                            object={item.object}
                                            repostCount={item.object.repostCount ?? 0}
                                            type='Note'
                                            onClick={() => {
                                                navigate(`/${item.object.type === 'Article' ? 'reader' : 'notes'}/${encodeURIComponent(item.object.id)}`);
                                            }}
                                        />
                                    )
                                );
                            })}
                            <div ref={postRef} className={`${canGoBack ? 'scroll-mt-[12px]' : 'scroll-mt-[124px]'}`}>
                                <div className={`${threadParents.length > 0 && 'min-h-[calc(100vh-52px)]'}`}>
                                    <FeedItem
                                        actor={currentPost.actor}
                                        allowDelete={false}
                                        commentCount={replyCount}
                                        last={true}
                                        layout={'modal'}
                                        likeCount={object.likeCount ?? 0}
                                        object={object}
                                        repostCount={object.repostCount}
                                        showHeader={threadParents.length > 0}
                                        showStats={true}
                                        type='Note'
                                    />
                                    <APReplyBox
                                        object={object}
                                        onReply={() => handleReplyCountChange(1)}
                                        onReplyError={() => handleReplyCountChange(-1)}
                                    />
                                    <FeedItemDivider />
                                    <div ref={repliesRef}>
                                        {
                                            processedReplies.map((replyGroup, groupIndex) => {
                                                const isLastGroup = groupIndex === processedReplies.length - 1;
                                                const chainId = replyGroup.mainReply.id;
                                                const isExpanded = expandedChains.has(chainId);
                                                const isFullyExpanded = fullyExpandedChains.has(chainId);
                                                const isChainLoading = loadingChains.has(chainId);
                                                const hasChain = replyGroup.chain.length > 0;

                                                return (
                                                    <React.Fragment key={replyGroup.mainReply.id}>
                                                        <FeedItem
                                                            actor={replyGroup.mainReply.actor}
                                                            allowDelete={replyGroup.mainReply.object.authored}
                                                            commentCount={replyGroup.mainReply.object.replyCount ?? 0}
                                                            isChainParent={hasChain}
                                                            isPending={isPendingActivity(replyGroup.mainReply.id)}
                                                            last={!hasChain}
                                                            layout='reply'
                                                            likeCount={replyGroup.mainReply.object.likeCount ?? 0}
                                                            object={replyGroup.mainReply.object}
                                                            parentId={object.id}
                                                            repostCount={replyGroup.mainReply.object.repostCount ?? 0}
                                                            type='Note'
                                                            onClick={() => {
                                                                navigate(`/notes/${encodeURIComponent(replyGroup.mainReply.id)}`);
                                                            }}
                                                            onDelete={handleDelete}
                                                        />

                                                        {hasChain && replyGroup.chain[0] && (
                                                            <FeedItem
                                                                key={replyGroup.chain[0].id}
                                                                actor={replyGroup.chain[0].actor}
                                                                allowDelete={replyGroup.chain[0].object.authored}
                                                                commentCount={replyGroup.chain[0].object.replyCount ?? 0}
                                                                isChainContinuation={true}
                                                                isPending={isPendingActivity(replyGroup.chain[0].id)}
                                                                last={replyGroup.chain.length === 1}
                                                                layout='reply'
                                                                likeCount={replyGroup.chain[0].object.likeCount ?? 0}
                                                                object={replyGroup.chain[0].object}
                                                                parentId={object.id}
                                                                repostCount={replyGroup.chain[0].object.repostCount ?? 0}
                                                                type='Note'
                                                                onClick={() => {
                                                                    navigate(`/notes/${encodeURIComponent(replyGroup.chain[0].id)}`);
                                                                }}
                                                                onDelete={handleDelete}
                                                            />
                                                        )}

                                                        {hasChain && isExpanded && replyGroup.chain.slice(1).map((chainItem: Activity, chainIndex: number) => {
                                                            const isLastChainItem = chainIndex === replyGroup.chain.slice(1).length - 1;
                                                            const hasMoreReplies = hasMoreChildReplies && hasMoreChildReplies(groupIndex);
                                                            const shouldShowConnector = isLastChainItem && hasMoreReplies;

                                                            return (
                                                                <FeedItem
                                                                    key={chainItem.id}
                                                                    actor={chainItem.actor}
                                                                    allowDelete={chainItem.object.authored}
                                                                    commentCount={chainItem.object.replyCount ?? 0}
                                                                    isChainContinuation={true}
                                                                    isPending={isPendingActivity(chainItem.id)}
                                                                    last={isLastChainItem && !shouldShowConnector}
                                                                    layout='reply'
                                                                    likeCount={chainItem.object.likeCount ?? 0}
                                                                    object={chainItem.object}
                                                                    parentId={object.id}
                                                                    repostCount={chainItem.object.repostCount ?? 0}
                                                                    type='Note'
                                                                    onClick={() => {
                                                                        navigate(`/notes/${encodeURIComponent(chainItem.id)}`);
                                                                    }}
                                                                    onDelete={handleDelete}
                                                                />
                                                            );
                                                        })}

                                                        {hasChain && replyGroup.chain.length > 1 && !isExpanded && (
                                                            <ShowRepliesButton
                                                                variant='expand'
                                                                onClick={() => toggleChain(chainId)}
                                                            />
                                                        )}

                                                        {hasChain && isExpanded && isFullyExpanded && hasMoreChildReplies && hasMoreChildReplies(groupIndex) && (
                                                            <ShowRepliesButton
                                                                loading={isChainLoading}
                                                                variant='loadMore'
                                                                onClick={() => loadMoreForChain(chainId, groupIndex)}
                                                            />
                                                        )}

                                                        {!isLastGroup && <FeedItemDivider />}
                                                    </React.Fragment>
                                                );
                                            })
                                        }

                                        {isLoadingMoreTopLevelReplies && (
                                            <div className='flex flex-col items-center justify-center text-center'>
                                                <LoadingIndicator size='md' />
                                            </div>
                                        )}
                                    </div>

                                    {hasMoreChildren && <div ref={loadMoreRef} className='h-1'></div>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Note;
