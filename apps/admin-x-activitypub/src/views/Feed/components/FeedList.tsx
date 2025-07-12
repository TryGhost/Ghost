import FeedInput from './FeedInput';
import FeedItem from '@src/components/feed/FeedItem';
import Layout from '@src/components/layout';
import NewNoteModal from '@src/components/modals/NewNoteModal';
import SuggestedProfiles from './SuggestedProfiles';
import {Activity} from '@src/api/activitypub';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, LoadingIndicator, LucideIcon, Separator} from '@tryghost/shade';
import {EmptyViewIcon, EmptyViewIndicator} from '@src/components/global/EmptyViewIndicator';
import {isPendingActivity} from '@src/utils/pending-activity';
import {useEffect, useRef} from 'react';
import {useNavigate} from '@tryghost/admin-x-framework';

export type FeedListProps = {
    isLoading: boolean,
    activities: Activity[],
    user: ActorProperties,
    fetchNextPage: () => void,
    hasNextPage: boolean,
    isFetchingNextPage: boolean
}

const FeedList:React.FC<FeedListProps> = ({
    isLoading,
    activities,
    user,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
}) => {
    const navigate = useNavigate();

    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const endLoadMoreRef = useRef<HTMLDivElement | null>(null);

    // Group activities by their original post content
    type GroupedActivity = { mainActivity: Activity; reposters: { actor: Activity['actor']; activity: Activity }[] };
    const groupedActivities = activities.reduce((acc, activity) => {
        // Use the post content URL as the grouping key since all reposts share the same base post
        const groupKey = activity.object.url || activity.id;

        if (!acc[groupKey]) {
            acc[groupKey] = {
                mainActivity: activity,
                reposters: []
            };

            if (activity.type === 'Announce' && activity.actor) {
                acc[groupKey].reposters.push({
                    actor: activity.actor,
                    activity: activity
                });
            }
        } else {
            if (activity.type === 'Announce' && activity.actor) {
                acc[groupKey].reposters.push({
                    actor: activity.actor,
                    activity: activity
                });
            } else if (activity.type === 'Create') {
                acc[groupKey].mainActivity = activity;
            }
        }

        return acc;
    }, {} as Record<string, GroupedActivity>);

    const consolidatedActivities = (Object.values(groupedActivities) as GroupedActivity[])
        .map((group: GroupedActivity) => ({
            mainActivity: group.mainActivity,
            reposts: group.reposters.map(r => r.activity),
            mostRecentDate: Math.max(
                new Date(group.mainActivity.object.published || 0).getTime(),
                ...group.reposters.map(r => new Date(r.activity.object.published || 0).getTime())
            )
        }))
        .sort((a, b) => b.mostRecentDate - a.mostRecentDate);

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

    const loadMoreIndex = Math.max(0, Math.floor(consolidatedActivities.length * 0.75) - 1);

    return (
        <Layout>
            <div className='flex w-full flex-col'>
                <div className='w-full'>
                    {consolidatedActivities.length > 0 ? (
                        <div className='my-4'>
                            <div className='mx-auto flex items-start gap-11'>
                                <div className='flex w-full min-w-0 flex-col items-center'>
                                    <div className='flex w-full min-w-0 max-w-[620px] flex-col items-start'>
                                        <FeedInput user={user} />
                                        <ul className='mx-auto flex w-full flex-col px-4' data-testid="feed-list">
                                            {consolidatedActivities.map((group, index) => (
                                                <li
                                                // eslint-disable-next-line react/no-array-index-key
                                                    key={`${group.mainActivity.id}-${group.mainActivity.type}-${index}`}
                                                    data-testid="feed-item"
                                                    data-test-view-article
                                                >
                                                    <FeedItem
                                                        actor={group.mainActivity.object.attributedTo || group.mainActivity.actor}
                                                        allowDelete={group.mainActivity.object.authored}
                                                        commentCount={group.mainActivity.object.replyCount ?? 0}
                                                        isLoading={isLoading}
                                                        isPending={isPendingActivity(group.mainActivity.id)}
                                                        layout={'feed'}
                                                        likeCount={group.mainActivity.object.likeCount ?? 0}
                                                        object={group.mainActivity.object}
                                                        repostCount={group.mainActivity.object.repostCount ?? 0}
                                                        reposts={group.reposts}
                                                        type={group.reposts.length > 0 ? 'Create' : group.mainActivity.type}
                                                        onClick={() => {
                                                            navigate(`/notes/${encodeURIComponent(group.mainActivity.id)}`);
                                                        }}
                                                    />
                                                    {index < consolidatedActivities.length - 1 && (
                                                        <Separator />
                                                    )}
                                                    {index === 3 && (
                                                        <SuggestedProfiles />
                                                    )}
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
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className='flex w-full flex-col items-center gap-10'>
                            <div className='mt-4 flex w-full max-w-[620px] flex-col items-center'>
                                <FeedInput user={user} />
                                <div className='mt-[-128px]'>
                                    <EmptyViewIndicator>
                                        <EmptyViewIcon><LucideIcon.Hash /></EmptyViewIcon>
                                        <div>The Feed is the stream of thoughts and <span className='text-black dark:text-white'>bite-sized updates</span> from people you follow in the Social Web. It&apos;s looking a little empty right now but once the people you follow start posting, their updates will show up here.</div>
                                        <NewNoteModal>
                                            <Button className='text-white dark:text-black'>
                                                <LucideIcon.FilePen />
                                            Write your first note
                                            </Button>
                                        </NewNoteModal>
                                    </EmptyViewIndicator>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default FeedList;
