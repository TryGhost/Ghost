import FeedItem from '@components/feed/FeedItem';
import Layout from '@src/components/layout/Layout';
import React, {useRef} from 'react';
import {Skeleton} from '@tryghost/shade';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import {usePostForUser, useThreadForUser} from '@hooks/use-activity-pub-queries';

const FeedItemDivider: React.FC = () => (
    <div className="h-px bg-gray-200 dark:bg-gray-950"></div>
);

const ContentView = () => {
    // const location = useLocation();
    // const activity = location.state.activity;

    const {postId} = useParams();

    const activityId = postId ? decodeURIComponent(postId) : '';
    const {data: post, isLoading: isPostLoading} = usePostForUser('index', postId!);
    const object = post?.object;

    const {data: thread} = useThreadForUser('index', activityId);
    const threadPostIdx = (thread?.posts ?? []).findIndex(item => item.object.id === activityId);
    const threadChildren = (thread?.posts ?? []).slice(threadPostIdx + 1);

    // const [replyCount] = useState(object.replyCount ?? 0);

    const repliesRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    return (
        <Layout>
            {isPostLoading ?
                <div className='mx-auto mt-8 flex max-w-[620px] items-center gap-3 px-8'>
                    <Skeleton className='h-10 w-10 rounded-full' />
                    <div className='grow'>
                        <Skeleton className='w-full' />
                        <Skeleton className='w-2/3' />
                    </div>
                </div>
                :
                <div className='mx-auto flex h-full max-w-[620px] flex-col'>
                    <div className='relative flex-1'>
                        <div className='grow overflow-y-auto'>
                            <div className={`mx-auto px-8 pb-10 pt-5`}>
                                <FeedItem
                                    actor={post.actor}
                                    allowDelete={false}
                                    commentCount={object.replyCount}
                                    last={true}
                                    layout={'modal'}
                                    object={object}
                                    repostCount={object.repostCount}
                                    // showHeader={threadParents.length > 0}
                                    // showStats={!disableStats}
                                    type='Note'
                                    onCommentClick={() => {
                                        // repliesRef.current?.scrollIntoView({
                                        //     behavior: 'smooth',
                                        //     block: 'center'
                                        // });
                                        // setIsFocused(true);
                                    }}
                                />
                                <div ref={repliesRef}>
                                    {threadChildren.map((item, index) => {
                                        const showDivider = index !== threadChildren.length - 1;

                                        return (
                                            <React.Fragment key={item.id}>
                                                <FeedItem
                                                    actor={item.actor}
                                                    allowDelete={item.object.authored}
                                                    commentCount={item.object.replyCount ?? 0}
                                                    // isPending={isPendingActivity(item.id)}
                                                    last={true}
                                                    layout='reply'
                                                    object={item.object}
                                                    parentId={object.id}
                                                    repostCount={item.object.repostCount ?? 0}
                                                    type='Note'
                                                    onClick={() => {
                                                        navigate(`/feed/${encodeURIComponent(item.id)}`, {
                                                            state: {activity: item}
                                                        });
                                                    }}
                                                    onCommentClick={() => {
                                                        // navigateForward(item.id, item.object, item.actor, true);
                                                        // setIsFocused(true);
                                                    }}
                                                    // onDelete={decrementReplyCount}
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
            }
        </Layout>
    );
};

export default ContentView;
