import React, {useEffect, useRef, useState} from 'react';

import NiceModal, {useModal} from '@ebay/nice-modal-react';
import {Activity, ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Heading, List, LoadingIndicator, Modal, NoValueLabel, Tab,TabView} from '@tryghost/admin-x-design-system';
import {UseInfiniteQueryResult} from '@tanstack/react-query';

import {type GetFollowersForProfileResponse, type GetFollowingForProfileResponse} from '../../api/activitypub';
import {useFollowersForProfile, useFollowingForProfile} from '../../hooks/useActivityPubQueries';

import APAvatar from '../global/APAvatar';
import ActivityItem from '../activities/ActivityItem';
import FeedItem from '../feed/FeedItem';
import FollowButton from '../global/FollowButton';
import getUsername from '../../utils/get-username';

const noop = () => {};

type QueryPageData = GetFollowersForProfileResponse | GetFollowingForProfileResponse;

type QueryFn = (handle: string) => UseInfiniteQueryResult<QueryPageData, unknown>;

type ActorListProps = {
    handle: string,
    noResultsMessage: string,
    queryFn: QueryFn,
    resolveDataFn: (data: QueryPageData) => GetFollowersForProfileResponse['followers'] | GetFollowingForProfileResponse['following'];
};

const ActorList: React.FC<ActorListProps> = ({
    handle,
    noResultsMessage,
    queryFn,
    resolveDataFn
}) => {
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = queryFn(handle);

    const actorData = (data?.pages.flatMap(resolveDataFn) ?? []);

    // Intersection observer to fetch more data when the user scrolls
    // to the bottom of the list
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

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

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <div>
            {
                actorData.length === 0 && !isLoading ? (
                    <NoValueLabel icon='user-add'>
                        {noResultsMessage}
                    </NoValueLabel>
                ) : (
                    <List>
                        {actorData.map(({actor, isFollowing}) => {
                            return (
                                <ActivityItem key={actor.id} url={actor.url}>
                                    <APAvatar author={actor} />
                                    <div>
                                        <div className='text-grey-600'>
                                            <span className='mr-1 font-bold text-black'>{actor.name || actor.preferredUsername || 'Unknown'}</span>
                                            <div className='text-sm'>{getUsername(actor)}</div>
                                        </div>
                                    </div>
                                    <FollowButton
                                        className='ml-auto'
                                        following={isFollowing}
                                        handle={getUsername(actor)}
                                        type='link'
                                    />
                                </ActivityItem>
                            );
                        })}
                    </List>
                )
            }
            <div ref={loadMoreRef} className='h-1'></div>
            {
                (isFetchingNextPage || isLoading) && (
                    <div className='mt-6 flex flex-col items-center justify-center space-y-4 text-center'>
                        <LoadingIndicator size='md' />
                    </div>
                )
            }
        </div>
    );
};

const FollowersTab: React.FC<{handle: string}> = ({handle}) => {
    return (
        <ActorList
            handle={handle}
            noResultsMessage={`${handle} has no followers yet`}
            queryFn={useFollowersForProfile}
            resolveDataFn={page => ('followers' in page ? page.followers : [])}
        />
    );
};

const FollowingTab: React.FC<{handle: string}> = ({handle}) => {
    return (
        <ActorList
            handle={handle}
            noResultsMessage={`${handle} is not following anyone yet`}
            queryFn={useFollowingForProfile}
            resolveDataFn={page => ('following' in page ? page.following : [])}
        />
    );
};

interface ProfileSearchResultModalProps {
    profile: {
        actor: ActorProperties;
        handle: string;
        followerCount: number;
        followingCount: number;
        isFollowing: boolean;
        posts: Activity[];
    };
    onFollow: () => void;
    onUnfollow: () => void;
}

type ProfileTab = 'posts' | 'following' | 'followers';

const ProfileSearchResultModal: React.FC<ProfileSearchResultModalProps> = ({
    profile,
    onFollow = noop,
    onUnfollow = noop
}) => {
    const modal = useModal();
    const [selectedTab, setSelectedTab] = useState<ProfileTab>('posts');

    const attachments = (profile.actor.attachment || []);
    const posts = (profile.posts || []).filter(post => post.type !== 'Announce');

    const tabs = [
        {
            id: 'posts',
            title: 'Posts',
            contents: (
                <div>
                    {posts.map(post => (
                        <FeedItem
                            actor={profile.actor}
                            comments={post.object.replies}
                            layout='feed'
                            object={post.object}
                            type={post.type}
                            onCommentClick={() => {}}
                        />
                    ))}
                </div>
            )
        },
        {
            id: 'following',
            title: 'Following',
            contents: (
                <FollowingTab handle={profile.handle} />
            ),
            counter: profile.followingCount
        },
        {
            id: 'followers',
            title: 'Followers',
            contents: (
                <FollowersTab handle={profile.handle} />
            ),
            counter: profile.followerCount
        }
    ].filter(Boolean) as Tab<ProfileTab>[];

    return (
        <Modal
            align='right'
            animate={true}
            footer={<></>}
            height={'full'}
            padding={false}
            size='bleed'
            width={640}
        >
            <div className='sticky top-0 z-50 border-grey-200 bg-white py-3'>
                <div className='grid h-8 grid-cols-3'>
                    <div className='col-[3/4] flex items-center justify-end space-x-6 px-8'>
                        <Button icon='close' size='sm' unstyled onClick={() => modal.remove()}/>
                    </div>
                </div>
            </div>
            <div className='z-0 mx-auto mt-4 flex w-full max-w-[580px] flex-col items-center pb-16'>
                <div className='mx-auto w-full'>
                    {profile.actor.image && (<div className='h-[200px] w-full overflow-hidden rounded-lg bg-gradient-to-tr from-grey-200 to-grey-100'>
                        <img
                            alt={profile.actor.name}
                            className='h-full w-full object-cover'
                            src={profile.actor.image.url}
                        />
                    </div>)}
                    <div className={`${profile.actor.image && '-mt-12'} px-4`}>
                        <div className='flex items-end justify-between'>
                            <div className='rounded-xl outline outline-4 outline-white'>
                                <APAvatar
                                    author={profile.actor}
                                    size='lg'
                                />
                            </div>
                            <FollowButton
                                following={profile.isFollowing}
                                handle={profile.handle}
                                onFollow={onFollow}
                                onUnfollow={onUnfollow}
                            />
                        </div>
                        <Heading className='mt-4' level={3}>{profile.actor.name}</Heading>
                        <span className='mt-1 inline-block text-[1.5rem] text-grey-800'>{profile.handle}</span>
                        <div
                            dangerouslySetInnerHTML={{__html: profile.actor.summary}}
                            className='ap-profile-content mt-3 text-[1.5rem] [&>p]:mb-3'
                        />
                        {attachments.map(attachment => (
                            <span className='mt-3 line-clamp-1 flex flex-col text-[1.5rem]'>
                                <span className={`text-xs font-semibold`}>{attachment.name}</span>
                                <span dangerouslySetInnerHTML={{__html: attachment.value}} className='ap-profile-content truncate'/>
                            </span>
                        ))}
                        <TabView<ProfileTab>
                            containerClassName='mt-6'
                            selectedTab={selectedTab}
                            tabs={tabs}
                            onTabChange={setSelectedTab}
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default NiceModal.create(ProfileSearchResultModal);
