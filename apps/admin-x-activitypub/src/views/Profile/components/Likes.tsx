import FeedItem from '@src/components/feed/FeedItem';
import {Activity} from '@src/api/activitypub';
import {LoadingIndicator, NoValueLabel} from '@tryghost/admin-x-design-system';
import {Separator} from '@tryghost/shade';
import {handleViewContent} from '@src/utils/content-handlers';
import {useEffect, useRef} from 'react';

export type LikesProps = {
    isLoading: boolean,
    posts: Activity[],
    fetchNextPage: () => void,
    hasNextPage: boolean,
    isFetchingNextPage: boolean
}

const Likes: React.FC<LikesProps> = ({
    posts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
}) => {
    // const {postsLikedByAccountQuery} = usePostsLikedByAccount({enabled: true});
    // const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = postsLikedByAccountQuery;

    // const posts = data?.pages.flatMap(page => page.posts) ?? Array.from({length: 5}, (_, index) => ({id: `placeholder-${index}`, object: {}}));

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

    return (
        <>
            {hasNextPage === false && posts.length === 0 && (
                <NoValueLabel icon='heart'>
                    You haven&apos;t liked anything yet.
                </NoValueLabel>
            )}
            <ul className='mx-auto flex max-w-[640px] flex-col'>
                {posts.map((activity, index) => (
                    <li
                        key={`likes-${activity.id}`}
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
                            onClick={() => handleViewContent(activity, false)}
                            onCommentClick={() => handleViewContent(activity, true)}
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

export default Likes;