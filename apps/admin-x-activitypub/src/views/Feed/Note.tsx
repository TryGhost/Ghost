import APAvatar from '@src/components/global/APAvatar';
import APReplyBox from '@src/components/global/APReplyBox';
import DeletedFeedItem from '@src/components/feed/DeletedFeedItem';
import FeedItem from '@components/feed/FeedItem';
import Layout from '@src/components/layout/Layout';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import getUsername from '@src/utils/get-username';
import {Activity} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, LucideIcon, Skeleton} from '@tryghost/shade';
import {EmptyViewIcon, EmptyViewIndicator} from '@src/components/global/EmptyViewIndicator';
import {Post} from '@src/api/activitypub';
import {handleProfileClick} from '@src/utils/handle-profile-click';
import {isPendingActivity} from '@src/utils/pending-activity';
import {mapPostToActivity} from '@src/utils/posts';
import {renderTimestamp} from '@src/utils/render-timestamp';
import {useNavigate, useNavigationStack, useParams} from '@tryghost/admin-x-framework';
import {useReplyChainForUser} from '@hooks/use-activity-pub-queries';

const FeedItemDivider: React.FC = () => (
    <div className="h-px bg-gray-200 dark:bg-gray-950"></div>
);

const ShowRepliesButton: React.FC<{count: number, onClick: () => void}> = ({count, onClick}) => {
    const buttonRef = useRef<HTMLDivElement>(null);

    const handleClick = () => {
        const container = document.querySelector('[data-scrollable-container]') as HTMLElement;
        const scrollTop = container ? container.scrollTop : window.scrollY;

        onClick();

        setTimeout(() => {
            if (container) {
                container.scrollTop = scrollTop;
            } else {
                window.scrollTo(0, scrollTop);
            }
        }, 0);
    };

    return (
        <div ref={buttonRef} className="flex items-center justify-center py-3">
            <Button
                className="hover:text-blue-800 text-sm font-medium text-blue-600"
                variant="ghost"
                onClick={(e: React.MouseEvent<HTMLElement>) => {
                    e.preventDefault();
                    e.stopPropagation();
                    (e.target as HTMLElement).blur();
                    handleClick();
                }}
            >
                Show {count} more {count === 1 ? 'reply' : 'replies'}
            </Button>
        </div>
    );
};

const Note = () => {
    const {postId} = useParams();
    const {canGoBack} = useNavigationStack();

    const activityId = postId ? decodeURIComponent(postId) : '';
    const {data: replyChain, isLoading} = useReplyChainForUser('index', activityId);

    const post = replyChain?.post ? mapPostToActivity(replyChain.post) : null;
    const object = post?.object;

    const [replyCount, setReplyCount] = useState(object?.replyCount ?? 0);
    const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (object?.replyCount !== undefined) {
            setReplyCount(object.replyCount);
        }
    }, [object?.replyCount]);

    const threadParents = useMemo(() => {
        return replyChain?.ancestors.chain.map(mapPostToActivity) ?? [];
    }, [replyChain?.ancestors.chain]);

    const threadChildren: Array<{activity: Activity, isChainContinuation: boolean, chainId?: string, showRepliesButton?: boolean, remainingCount?: number}> = [];

    replyChain?.children.forEach((child: {post: Post, chain: Post[]}, childIndex: number) => {
        const childActivity = mapPostToActivity(child.post);
        const chainId = `chain-${childIndex}`;
        const isChainExpanded = expandedChains.has(chainId);

        threadChildren.push({
            activity: childActivity,
            isChainContinuation: false,
            chainId
        });

        if (child.chain.length > 0) {
            if (child.chain.length === 1 || isChainExpanded) {
                child.chain.forEach((chainPost: Post) => {
                    threadChildren.push({
                        activity: mapPostToActivity(chainPost),
                        isChainContinuation: true,
                        chainId
                    });
                });
            } else {
                threadChildren.push({
                    activity: mapPostToActivity(child.chain[0]),
                    isChainContinuation: true,
                    chainId,
                    showRepliesButton: true,
                    remainingCount: child.chain.length - 1
                });
            }
        }
    });

    const toggleChain = (chainId: string) => {
        setExpandedChains((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(chainId)) {
                newSet.delete(chainId);
            } else {
                newSet.add(chainId);
            }
            return newSet;
        });
    };

    function handleReplyCountChange(increment: number) {
        setReplyCount((current: number) => current + increment);
    }

    function handleDelete() {
        handleReplyCountChange(-1);
    }

    const repliesRef = useRef<HTMLDivElement>(null);
    const postRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (postRef.current && threadParents.length > 0) {
            postRef.current.scrollIntoView({
                behavior: 'instant',
                block: 'start'
            });
        }
    }, [threadParents]);

    return (
        <Layout>
            {isLoading ?
                <div className='mx-auto mt-8 flex max-w-[620px] items-center gap-3 px-8 pt-7'>
                    <Skeleton className='size-10 rounded-full' />
                    <div className='grow pt-1'>
                        <Skeleton className='w-full' />
                        <Skeleton className='w-2/3' />
                    </div>
                </div>
                :
                <>
                    {post ?
                        <div className='mx-auto flex h-full max-w-[620px] flex-col'>
                            <div className='relative flex-1'>
                                <div className='grow overflow-y-auto'>
                                    <div className={`mx-auto px-8 pb-10 pt-5`}>
                                        {!threadParents.length &&
                                        <div className={`col-[2/3] mx-auto flex w-full items-center gap-3 ${canGoBack ? 'pt-10' : 'pt-5'}`}>
                                            <div className='relative z-10 pt-[3px]'>
                                                <APAvatar author={post.actor}/>
                                            </div>
                                            <div className='relative z-10 flex w-full min-w-0 cursor-pointer flex-col overflow-visible text-[1.5rem]' onClick={(e) => {
                                                handleProfileClick(post.actor, navigate, e);
                                            }}>
                                                <div className='flex w-full'>
                                                    <span className='min-w-0 truncate whitespace-nowrap font-semibold hover:underline'>{post.actor.name}</span>
                                                </div>
                                                <div className='flex w-full'>
                                                    <span className='text-gray-700 after:mx-1 after:font-normal after:text-gray-700 after:content-["·"]'>{getUsername(post.actor)}</span>
                                                    <span className='text-gray-700'>{renderTimestamp(object, !object.authored)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        }

                                        {threadParents.map((item: Activity, index: number) => {
                                            return (
                                                <React.Fragment key={item.id || index}>
                                                    {item.object.type === 'Tombstone' ? (
                                                        <DeletedFeedItem last={false} />
                                                    ) : (
                                                        <FeedItem
                                                            actor={item.actor}
                                                            allowDelete={false}
                                                            commentCount={item.object.replyCount ?? 0}
                                                            last={false}
                                                            layout='reply'
                                                            object={item.object}
                                                            repostCount={item.object.repostCount ?? 0}
                                                            type='Note'
                                                            onClick={() => {
                                                                navigate(`/${item.object.type === 'Article' ? 'inbox' : 'feed'}/${encodeURIComponent(item.object.id)}`);
                                                            }}
                                                        />
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                        <div ref={postRef} className={`${canGoBack ? 'scroll-mt-[10px]' : 'scroll-mt-[124px]'}`}>
                                            <div className={`${threadParents.length > 0 && 'min-h-[calc(100vh-52px)]'}`}>
                                                <FeedItem
                                                    actor={post.actor}
                                                    allowDelete={false}
                                                    commentCount={replyCount}
                                                    last={true}
                                                    layout={'modal'}
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
                                                    {threadChildren.map((item: {activity: Activity, isChainContinuation: boolean, chainId?: string, showRepliesButton?: boolean, remainingCount?: number}, index: number) => {
                                                        const nextItem = threadChildren[index + 1];
                                                        const showDivider = index !== threadChildren.length - 1 && !(nextItem?.isChainContinuation);
                                                        const isLastItem = index === threadChildren.length - 1 || (nextItem && !nextItem.isChainContinuation);

                                                        return (
                                                            <React.Fragment key={item.activity.id}>
                                                                <FeedItem
                                                                    actor={item.activity.actor}
                                                                    allowDelete={item.activity.object.authored}
                                                                    commentCount={item.activity.object.replyCount ?? 0}
                                                                    isPending={isPendingActivity(item.activity.id)}
                                                                    last={isLastItem}
                                                                    layout='reply'
                                                                    object={item.activity.object}
                                                                    parentId={object.id}
                                                                    repostCount={item.activity.object.repostCount ?? 0}
                                                                    type='Note'
                                                                    onClick={() => {
                                                                        navigate(`/feed/${encodeURIComponent(item.activity.id)}`);
                                                                    }}
                                                                    onDelete={handleDelete}
                                                                />
                                                                {item.showRepliesButton && (
                                                                    <ShowRepliesButton
                                                                        count={item.remainingCount!}
                                                                        onClick={() => toggleChain(item.chainId!)}
                                                                    />
                                                                )}
                                                                {showDivider && <FeedItemDivider />}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        :
                        <div className='mx-auto mt-4 flex w-full max-w-[620px] flex-col items-center'>
                            <EmptyViewIndicator>
                                <EmptyViewIcon><LucideIcon.Hash /></EmptyViewIcon>
                                <div>Error loading note.</div>
                            </EmptyViewIndicator>
                        </div>
                    }
                </>
            }
        </Layout>
    );
};

export default Note;
