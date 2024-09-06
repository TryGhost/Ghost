import APAvatar from './global/APAvatar';
import ActivityItem from './activities/ActivityItem';
import MainNavigation from './navigation/MainNavigation';
import React, {useState} from 'react';
import getUsername from '../utils/get-username';
import {Button, Heading, List, NoValueLabel, Tab, TabView} from '@tryghost/admin-x-design-system';
import {useFollowersCountForUser, useFollowersForUser, useFollowingCountForUser, useFollowingForUser} from '../hooks/useActivityPubQueries';

interface ProfileProps {}

const Profile: React.FC<ProfileProps> = ({}) => {
    const {data: followersCount = 0} = useFollowersCountForUser('index');
    const {data: followingCount = 0} = useFollowingCountForUser('index');
    const {data: following = []} = useFollowingForUser('index');
    const {data: followers = []} = useFollowersForUser('index');

    type ProfileTab = 'posts' | 'likes' | 'following' | 'followers';

    const [selectedTab, setSelectedTab] = useState<ProfileTab>('posts');

    const tabs = [
        {
            id: 'posts',
            title: 'Posts',
            contents: (<div><NoValueLabel icon='pen'>
                You haven&apos;t posted anything yet.
            </NoValueLabel></div>),
            counter: 240
        },
        {
            id: 'likes',
            title: 'Likes',
            contents: (<div><NoValueLabel icon='heart'>
                You haven&apos;t liked anything yet.
            </NoValueLabel></div>),
            counter: 27
        },
        {
            id: 'following',
            title: 'Following',
            contents: (
                <div>
                    {following.length === 0 ? (
                        <NoValueLabel icon='user-add'>
                            You haven&apos;t followed anyone yet.
                        </NoValueLabel>
                    ) : (
                        <List>
                            {following.map((item) => {
                                return (
                                    <ActivityItem key={item.id} url={item.url}>
                                        <APAvatar author={item} />
                                        <div>
                                            <div className='text-grey-600'>
                                                <span className='mr-1 font-bold text-black'>{item.name || item.preferredUsername || 'Unknown'}</span>
                                                <div className='text-sm'>{getUsername(item)}</div>
                                            </div>
                                        </div>
                                        <Button className='ml-auto' color='grey' label='Unfollow' link={true} onClick={(e) => {
                                            e?.preventDefault();
                                            alert('Implement me!');
                                        }} />
                                    </ActivityItem>
                                );
                            })}
                        </List>
                    )}
                </div>
            ),
            counter: followingCount
        },
        {
            id: 'followers',
            title: 'Followers',
            contents: (
                <div>
                    {followers.length === 0 ? (
                        <NoValueLabel icon='user-add'>
                            Nobody&apos;s following you yet. Their loss!
                        </NoValueLabel>
                    ) : (
                        <List>
                            {followers.map((item) => {
                                return (
                                    <ActivityItem key={item.id} url={item.url}>
                                        <APAvatar author={item} />
                                        <div>
                                            <div className='text-grey-600'>
                                                <span className='mr-1 font-bold text-black'>{item.name || item.preferredUsername || 'Unknown'}</span>
                                                <div className='text-sm'>{getUsername(item)}</div>
                                            </div>
                                        </div>
                                    </ActivityItem>
                                );
                            })}
                        </List>
                    )}
                </div>
            ),
            counter: followersCount
        }
    ].filter(Boolean) as Tab<ProfileTab>[];

    return (
        <>
            <MainNavigation title='Profile' />
            <div className='z-0 flex w-full flex-col items-center'>
                <div className='mx-auto mt-8 w-full max-w-[560px]' id='ap-sidebar'>
                    <div className='h-[200px] w-full rounded-lg bg-gradient-to-tr from-grey-200 to-grey-100'>
                    </div>
                    <div className='-mt-8 px-4'>
                        <div className='inline-flex rounded-lg border-4 border-white'>
                            <APAvatar size='lg' />
                        </div>
                        <Heading className='mt-4' level={3}>John Doe</Heading>
                        <span className='mt-1 text-[1.5rem] text-grey-800'>@index@site.com</span>
                        <p className='mt-3 text-[1.5rem]'>This is a summary/bio/etc which could be kinda long in certain cases but not always, so...</p>
                        <a className='mt-3 block text-[1.5rem] underline' href='#'>www.coolsite.com</a>
                        <TabView<'posts' | 'likes' | 'following' | 'followers'> containerClassName='mt-6' selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
                    </div>
                </div>
            </div>
        </>
    );
};

export default Profile;