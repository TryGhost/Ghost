import FeedItem from '@src/components/feed/FeedItem';
import {Activity} from '@src/api/activitypub';
import {LoadingIndicator, NoValueLabel} from '@tryghost/admin-x-design-system';
import {Separator} from '@tryghost/shade';
import {handleViewContent} from '@src/utils/content-handlers';
import {useEffect, useRef} from 'react';
import {useFeatureFlags} from '@src/lib/feature-flags';
import {useNavigate} from '@tryghost/admin-x-framework';

export type PostsProps = {
    posts: Activity[],
    isLoading: boolean,
    fetchNextPage: () => void,
    hasNextPage: boolean,
    isFetchingNextPage: boolean
}

const Posts: React.FC<PostsProps> = ({
    posts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
}) => {
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const endLoadMoreRef = useRef<HTMLDivElement | null>(null);

    // Calculate the index at which to place the loadMoreRef - This will place it ~75% through the list
    const loadMoreIndex = Math.max(0, Math.floor(posts.length * 0.75) - 1);

    useEffect(() => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        observerRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        });

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current);
        }
        if (endLoadMoreRef.current) {
            observerRef.current.observe(endLoadMoreRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const {isEnabled} = useFeatureFlags();
    const navigate = useNavigate();

    return (
        <>
            {hasNextPage === false && posts.length === 0 && (
                <NoValueLabel icon='pen'>
                    You haven&apos;t posted anything yet.
                </NoValueLabel>
            )}
            <ul className='mx-auto flex max-w-[640px] flex-col'>
                {posts.map((activity, index) => (
                    <li
                        key={`posts-${activity.id}`}
                        data-test-view-article
                    >
                        <FeedItem
                            actor={activity.actor}
                            allowDelete={activity.object.authored}
                            commentCount={activity.object.replyCount}
                            isLoading={isLoading}
                            layout='feed'
                            object={activity.object}
                            repostCount={activity.object.repostCount}
                            type={activity.type}
                            onClick={() => {
                                if (isEnabled('ap-routes')) {
                                    if (activity.object.type === 'Note') {
                                        navigate(`/feed/${encodeURIComponent(activity.object.id)}`);
                                    } else if (activity.object.type === 'Article') {
                                        navigate(`/inbox/${encodeURIComponent(activity.object.id)}`);
                                    }
                                } else {
                                    handleViewContent(activity, false);
                                }
                            }}
                            onCommentClick={() => {
                                if (isEnabled('ap-routes')) {
                                    if (activity.object.type === 'Note') {
                                        navigate(`/feed/${encodeURIComponent(activity.object.id)}`);
                                    } else if (activity.object.type === 'Article') {
                                        navigate(`/inbox/${encodeURIComponent(activity.object.id)}`);
                                    }
                                } else {
                                    handleViewContent(activity, true);
                                }
                            }}
                        />
                        {index < posts.length - 1 && <Separator />}
                        {index === loadMoreIndex && (
                            <div ref={loadMoreRef} className='h-1'></div>
                        )}
                    </li>
                ))}
                {isFetchingNextPage && (
                    <li className='flex flex-col items-center justify-center space-y-4 text-center'>
                        <LoadingIndicator size='md' />
                    </li>
                )}
            </ul>
            <div ref={endLoadMoreRef} className='h-1'></div>
        </>
    );
};

export default Posts;
