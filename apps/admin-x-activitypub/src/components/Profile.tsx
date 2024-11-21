import APAvatar from './global/APAvatar';
import ActivityItem from './activities/ActivityItem';
import FeedItem from './feed/FeedItem';
import MainNavigation from './navigation/MainNavigation';
import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useRef, useState} from 'react';
import getName from '../utils/get-name';
import getUsername from '../utils/get-username';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';

import Separator from './global/Separator';
import ViewProfileModal from './global/ViewProfileModal';
import {Button, Heading, List, LoadingIndicator, NoValueLabel, Tab, TabView} from '@tryghost/admin-x-design-system';
import {handleViewContent} from '../utils/content-handlers';
import {
    useFollowersCountForUser,
    useFollowersForUser,
    useFollowingCountForUser,
    useFollowingForUser,
    useLikedForUser,
    useOutboxForUser,
    useUserDataForUser
} from '../hooks/useActivityPubQueries';

interface ProfileProps {}

const Profile: React.FC<ProfileProps> = ({}) => {
    const {data: followersCount = 0, isLoading: isLoadingFollowersCount} = useFollowersCountForUser('index');
    const {data: followingCount = 0, isLoading: isLoadingFollowingCount} = useFollowingCountForUser('index');
    const {data: following = [], isLoading: isLoadingFollowing} = useFollowingForUser('index');
    const {data: followers = [], isLoading: isLoadingFollowers} = useFollowersForUser('index');
    const {data: liked = [], isLoading: isLoadingLiked} = useLikedForUser('index');
    const {data: outboxPosts = [], isLoading: isLoadingOutbox} = useOutboxForUser('index');
    const {data: userProfile, isLoading: isLoadingProfile} = useUserDataForUser('index') as {data: ActorProperties | null, isLoading: boolean};

    const isInitialLoading = isLoadingProfile || isLoadingOutbox;

    const posts = outboxPosts.filter(post => post.type === 'Create' && !post.object.inReplyTo);

    type ProfileTab = 'posts' | 'likes' | 'following' | 'followers';

    const [selectedTab, setSelectedTab] = useState<ProfileTab>('posts');

    const layout = 'feed';

    const INCREMENT_VISIBLE_POSTS = 40;
    const INCREMENT_VISIBLE_LIKES = 40;
    const INCREMENT_VISIBLE_FOLLOWING = 40;
    const INCREMENT_VISIBLE_FOLLOWERS = 40;

    const [visiblePosts, setVisiblePosts] = useState(INCREMENT_VISIBLE_POSTS);
    const [visibleLikes, setVisibleLikes] = useState(INCREMENT_VISIBLE_LIKES);
    const [visibleFollowing, setVisibleFollowing] = useState(INCREMENT_VISIBLE_FOLLOWING);
    const [visibleFollowers, setVisibleFollowers] = useState(INCREMENT_VISIBLE_FOLLOWERS);

    const loadMorePosts = () => {
        setVisiblePosts(prev => prev + INCREMENT_VISIBLE_POSTS);
    };

    const loadMoreLikes = () => {
        setVisibleLikes(prev => prev + INCREMENT_VISIBLE_LIKES);
    };

    const loadMoreFollowing = () => {
        setVisibleFollowing(prev => prev + INCREMENT_VISIBLE_FOLLOWING);
    };

    const loadMoreFollowers = () => {
        setVisibleFollowers(prev => prev + INCREMENT_VISIBLE_FOLLOWERS);
    };

    const handleUserClick = (actor: ActorProperties) => {
        NiceModal.show(ViewProfileModal, {
            profile: getUsername(actor),
            onFollow: () => {},
            onUnfollow: () => {}
        });
    };

    const renderPostsTab = () => {
        if (posts.length === 0) {
            return (
                <NoValueLabel icon='pen'>
                    You haven&apos;t posted anything yet.
                </NoValueLabel>
            );
        }

        return (
            <>
                <ul className='mx-auto flex max-w-[640px] flex-col'>
                    {posts.slice(0, visiblePosts).map((activity, index) => (
                        <li
                            key={activity.id}
                            data-test-view-article
                        >
                            <FeedItem
                                actor={activity.object?.attributedTo || activity.actor}
                                layout={layout}
                                object={activity.object}
                                type={activity.type}
                                onClick={() => handleViewContent(activity, false)}
                                onCommentClick={() => handleViewContent(activity, true)}
                            />
                            {index < posts.length - 1 && <Separator />}
                        </li>
                    ))}
                </ul>
                {visiblePosts < posts.length && (
                    <Button
                        className={`mt-3 self-start text-grey-900 transition-all hover:opacity-60`}
                        color='grey'
                        fullWidth={true}
                        label='Show more'
                        size='md'
                        onClick={loadMorePosts}
                    />
                )}
            </>
        );
    };

    const renderLikesTab = () => {
        if (isLoadingLiked) {
            return (
                <div className='flex h-40 items-center justify-center'>
                    <LoadingIndicator size='md' />
                </div>
            );
        }

        if (liked.length === 0) {
            return (
                <NoValueLabel icon='heart'>
                    You haven&apos;t liked anything yet.
                </NoValueLabel>
            );
        }

        return (
            <>
                <ul className='mx-auto flex max-w-[640px] flex-col'>
                    {liked.slice(0, visibleLikes).map((activity, index) => (
                        <li
                            key={activity.id}
                            data-test-view-article
                        >
                            <FeedItem
                                actor={activity.object?.attributedTo || activity.actor}
                                layout={layout}
                                object={Object.assign({}, activity.object, {liked: true})}
                                type={activity.type}
                                onClick={() => handleViewContent(activity, false)}
                                onCommentClick={() => handleViewContent(activity, true)}
                            />
                            {index < liked.length - 1 && <Separator />}
                        </li>
                    ))}
                </ul>
                {visibleLikes < liked.length && (
                    <Button
                        className={`mt-3 self-start text-grey-900 transition-all hover:opacity-60`}
                        color='grey'
                        fullWidth={true}
                        label='Show more'
                        size='md'
                        onClick={loadMoreLikes}
                    />
                )}
            </>
        );
    };

    const renderFollowingTab = () => {
        if (isLoadingFollowing || isLoadingFollowingCount) {
            return (
                <div className='flex h-40 items-center justify-center'>
                    <LoadingIndicator size='md' />
                </div>
            );
        }

        if (following.length === 0) {
            return (
                <NoValueLabel icon='user-add'>
                    You haven&apos;t followed anyone yet.
                </NoValueLabel>
            );
        }

        return (
            <>
                <List>
                    {following.slice(0, visibleFollowing).map((item, index) => (
                        <React.Fragment key={item.id}>
                            <ActivityItem
                                key={item.id}
                                url={item.url}
                                onClick={() => handleUserClick(item)}
                            >
                                <APAvatar author={item} />
                                <div>
                                    <div className='text-grey-600'>
                                        <span className='mr-1 font-bold text-black'>{getName(item)}</span>
                                        <div className='text-sm'>{getUsername(item)}</div>
                                    </div>
                                </div>
                            </ActivityItem>
                            {index < following.length - 1 && <Separator />}
                        </React.Fragment>
                    ))}
                </List>
                {visibleFollowing < following.length && (
                    <Button
                        className={`mt-3 self-start text-grey-900 transition-all hover:opacity-60`}
                        color='grey'
                        fullWidth={true}
                        label='Show more'
                        size='md'
                        onClick={loadMoreFollowing}
                    />
                )}
            </>
        );
    };

    const renderFollowersTab = () => {
        if (isLoadingFollowers || isLoadingFollowersCount) {
            return (
                <div className='flex h-40 items-center justify-center'>
                    <LoadingIndicator size='md' />
                </div>
            );
        }

        if (followers.length === 0) {
            return (
                <NoValueLabel icon='user-add'>
                    Nobody&apos;s following you yet. Their loss!
                </NoValueLabel>
            );
        }

        return (
            <>
                <List>
                    {followers.slice(0, visibleFollowers).map((item, index) => (
                        <React.Fragment key={item.id}>
                            <ActivityItem
                                key={item.id}
                                url={item.url}
                                onClick={() => handleUserClick(item)}
                            >
                                <APAvatar author={item} />
                                <div>
                                    <div className='text-grey-600'>
                                        <span className='mr-1 font-bold text-black'>{item.name || getName(item) || 'Unknown'}</span>
                                        <div className='text-sm'>{getUsername(item)}</div>
                                    </div>
                                </div>
                            </ActivityItem>
                            {index < followers.length - 1 && <Separator />}
                        </React.Fragment>
                    ))}
                </List>
                {visibleFollowers < followers.length && (
                    <Button
                        className={`mt-3 self-start text-grey-900 transition-all hover:opacity-60`}
                        color='grey'
                        fullWidth={true}
                        label='Show more'
                        size='md'
                        onClick={loadMoreFollowers}
                    />
                )}
            </>
        );
    };

    const tabs = [
        {
            id: 'posts',
            title: 'Posts',
            contents: <div className='ap-posts'>{renderPostsTab()}</div>,
            counter: posts.length
        },
        {
            id: 'likes',
            title: 'Likes',
            contents: <div className='ap-likes'>{renderLikesTab()}</div>,
            counter: liked.length
        },
        {
            id: 'following',
            title: 'Following',
            contents: <div>{renderFollowingTab()}</div>,
            counter: followingCount
        },
        {
            id: 'followers',
            title: 'Followers',
            contents: <div>{renderFollowersTab()}</div>,
            counter: followersCount
        }
    ].filter(Boolean) as Tab<ProfileTab>[];

    const attachments = (userProfile?.attachment || []);

    const [isExpanded, setisExpanded] = useState(false);

    const toggleExpand = () => {
        setisExpanded(!isExpanded);
    };

    const contentRef = useRef<HTMLDivElement | null>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    useEffect(() => {
        if (contentRef.current) {
            setIsOverflowing(contentRef.current.scrollHeight > 160); // Compare content height to max height
        }
    }, [isExpanded]);

    const renderMainContent = () => {
        if (isInitialLoading) {
            return (
                <div className='flex h-[calc(100vh-8rem)] items-center justify-center'>
                    <LoadingIndicator />
                </div>
            );
        }

        return (
            <div className='z-0 mx-auto mt-8 flex w-full max-w-[580px] flex-col items-center pb-16'>
                <div className='mx-auto w-full'>
                    {userProfile?.image && (
                        <div className='h-[200px] w-full overflow-hidden rounded-lg bg-gradient-to-tr from-grey-200 to-grey-100'>
                            <img
                                alt={userProfile?.name}
                                className='h-full w-full object-cover'
                                src={userProfile?.image.url}
                            />
                        </div>
                    )}
                    <div className={`${userProfile?.image && '-mt-12'} px-4`}>
                        <div className='flex items-end justify-between'>
                            <div className='rounded-xl outline outline-4 outline-white'>
                                <APAvatar
                                    author={userProfile as ActorProperties}
                                    size='lg'
                                />
                            </div>
                        </div>
                        <Heading className='mt-4' level={3}>{userProfile?.name}</Heading>
                        <span className='mt-1 text-[1.5rem] text-grey-800'>
                            <span>{userProfile && getUsername(userProfile)}</span>
                        </span>
                        {(userProfile?.summary || attachments.length > 0) && (
                            <div ref={contentRef} className={`ap-profile-content transition-max-height relative text-[1.5rem] duration-300 ease-in-out [&>p]:mb-3 ${isExpanded ? 'max-h-none pb-7' : 'max-h-[160px] overflow-hidden'} relative`}>
                                <div
                                    dangerouslySetInnerHTML={{__html: userProfile?.summary ?? ''}}
                                    className='ap-profile-content mt-3 text-[1.5rem] [&>p]:mb-3'
                                />
                                {attachments.map(attachment => (
                                    <span className='mt-3 line-clamp-1 flex flex-col text-[1.5rem]'>
                                        <span className={`text-xs font-semibold`}>{attachment.name}</span>
                                        <span dangerouslySetInnerHTML={{__html: attachment.value}} className='ap-profile-content truncate'/>
                                    </span>
                                ))}
                                {!isExpanded && isOverflowing && (
                                    <div className='absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/90 via-60% to-transparent' />
                                )}
                                {isOverflowing && <Button
                                    className='absolute bottom-0 text-pink'
                                    label={isExpanded ? 'Show less' : 'Show all'}
                                    link={true}
                                    onClick={toggleExpand}
                                />}
                            </div>
                        )}
                        <TabView<ProfileTab>
                            containerClassName='mt-6'
                            selectedTab={selectedTab}
                            tabs={tabs}
                            onTabChange={setSelectedTab}
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <MainNavigation page='profile' />
            {renderMainContent()}
        </>
    );
};

export default Profile;
