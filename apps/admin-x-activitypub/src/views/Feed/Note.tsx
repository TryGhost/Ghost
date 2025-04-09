import APAvatar from '@src/components/global/APAvatar';
import APReplyBox from '@src/components/global/APReplyBox';
import DeletedFeedItem from '@src/components/feed/DeletedFeedItem';
import FeedItem from '@components/feed/FeedItem';
import Layout from '@src/components/layout/Layout';
import React, {useEffect, useRef, useState} from 'react';
import getUsername from '@src/utils/get-username';
import {EmptyViewIcon, EmptyViewIndicator} from '@src/components/global/EmptyViewIndicator';
import {LucideIcon, Skeleton} from '@tryghost/shade';
import {handleProfileClickRR} from '@src/utils/handle-profile-click';
import {isPendingActivity} from '@src/utils/pending-activity';
import {renderTimestamp} from '@src/utils/render-timestamp';
import {useLocation, useNavigate, useNavigationStack, useParams} from '@tryghost/admin-x-framework';
import {usePostForUser, useThreadForUser} from '@hooks/use-activity-pub-queries';

const FeedItemDivider: React.FC = () => (
    <div className="h-px bg-gray-200 dark:bg-gray-950"></div>
);

const Note = () => {
    const {postId} = useParams();
    const location = useLocation();
    const {canGoBack} = useNavigationStack();
    const [focusReply, setFocusReply] = useState(false);
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        if (searchParams.get('focusReply') === 'true') {
            setFocusReply(true);
        }
    }, [location.search, setFocusReply]);

    const activityId = postId ? decodeURIComponent(postId) : '';
    const {data: post, isLoading: isPostLoading} = usePostForUser('index', postId!);
    const object = post?.object;

    const [replyCount, setReplyCount] = useState(object?.replyCount ?? 0);

    useEffect(() => {
        if (object?.replyCount !== undefined) {
            setReplyCount(object.replyCount);
        }
    }, [object?.replyCount]);

    const {data: thread} = useThreadForUser('index', activityId);
    const threadPostIdx = (thread?.posts ?? []).findIndex(item => item.object.id === activityId);
    const threadChildren = (thread?.posts ?? []).slice(threadPostIdx + 1);
    const threadParents = (thread?.posts ?? []).slice(0, threadPostIdx);

    function incrementReplyCount(step: number = 1) {
        setReplyCount((current: number) => current + step);
    }

    function decrementReplyCount(step: number = 1) {
        setReplyCount((current: number) => current - step);
    }

    const repliesRef = useRef<HTMLDivElement>(null);
    const postRef = useRef<HTMLDivElement>(null);
    const replyBoxRef = useRef<HTMLDivElement>(null);
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
            {isPostLoading ?
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
                                                handleProfileClickRR(post.actor, navigate, e);
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
                                                        object={item.object}
                                                        repostCount={item.object.repostCount ?? 0}
                                                        type='Note'
                                                        onClick={() => {
                                                            navigate(`/feed/${encodeURIComponent(item.object.id)}`);
                                                        }}
                                                        onCommentClick={() => {
                                                            navigate(`/feed/${encodeURIComponent(item.object.id)}?focusReply=true`);
                                                        }}
                                                    />
                                                )
                                            );
                                        })}
                                        <div ref={postRef} className={`${canGoBack ? 'scroll-mt-[10px]' : 'scroll-mt-[102px]'}`}>
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
                                                    onCommentClick={() => {
                                                        repliesRef.current?.scrollIntoView({
                                                            behavior: 'smooth',
                                                            block: 'center'
                                                        });
                                                        setFocusReply(true);
                                                    }}
                                                />
                                                <div ref={replyBoxRef}>
                                                    <APReplyBox
                                                        focused={focusReply ? 1 : 0}
                                                        object={object}
                                                        onReply={incrementReplyCount}
                                                        onReplyError={decrementReplyCount}
                                                    />
                                                </div>
                                                <FeedItemDivider />
                                                <div ref={repliesRef}>
                                                    {threadChildren.map((item, index) => {
                                                        const showDivider = index !== threadChildren.length - 1;

                                                        return (
                                                            <React.Fragment key={item.id}>
                                                                <FeedItem
                                                                    actor={item.actor}
                                                                    allowDelete={item.object.authored}
                                                                    commentCount={item.object.replyCount ?? 0}
                                                                    isPending={isPendingActivity(item.id)}
                                                                    last={true}
                                                                    layout='reply'
                                                                    object={item.object}
                                                                    parentId={object.id}
                                                                    repostCount={item.object.repostCount ?? 0}
                                                                    type='Note'
                                                                    onClick={() => {
                                                                        navigate(`/feed/${encodeURIComponent(item.id)}`);
                                                                    }}
                                                                    onCommentClick={() => {
                                                                        navigate(`/feed/${encodeURIComponent(item.id)}?focusReply=true`);
                                                                    }}
                                                                    onDelete={decrementReplyCount}
                                                                />
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
