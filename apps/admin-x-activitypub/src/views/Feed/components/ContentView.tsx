import FeedItem from '@components/feed/FeedItem';
import Layout from '@src/components/layout/Layout';
import React, {useRef, useState} from 'react';
import {useLocation, useNavigate, useParams} from '@tryghost/admin-x-framework';
import {useThreadForUser} from '@hooks/use-activity-pub-queries';

const FeedItemDivider: React.FC = () => (
    <div className="h-px bg-gray-200 dark:bg-gray-950"></div>
);

const ContentView = () => {
    const location = useLocation();
    const activity = location.state.activity;
    const object = activity?.object;

    const {encodedId} = useParams();
    const activityId = encodedId ? decodeURIComponent(encodedId) : '';
    const {data: thread, isLoading: isLoadingThread} = useThreadForUser('index', activityId);
    const threadPostIdx = (thread?.posts ?? []).findIndex(item => item.object.id === activityId);
    const threadChildren = (thread?.posts ?? []).slice(threadPostIdx + 1);
    const threadParents = (thread?.posts ?? []).slice(0, threadPostIdx);

    const [replyCount, setReplyCount] = useState(object.replyCount ?? 0);

    const repliesRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    return (
        <Layout>
            <div className='flex h-full flex-col max-w-[620px] mx-auto'>
                <div className='relative flex-1'>
                    <div className='grow overflow-y-auto'>
                        <div className={`mx-auto px-8 pb-10 pt-5`}>
                            <FeedItem
                                actor={activity.actor}
                                allowDelete={false}
                                commentCount={replyCount}
                                last={true}
                                layout={'modal'}
                                object={object}
                                repostCount={object.repostCount ?? 0}
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
        </Layout>
    );
};

export default ContentView;
