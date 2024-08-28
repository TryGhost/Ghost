import APAvatar from './global/APAvatar';
import MainNavigation from './navigation/MainNavigation';
import React, {useState} from 'react';
import {ActivityPubAPI} from '../api/activitypub';
import {Heading, NoValueLabel, Tab, TabView} from '@tryghost/admin-x-design-system';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useQuery} from '@tanstack/react-query';

interface ProfileProps {}

function useFollowersCountForUser(handle: string) {
    const site = useBrowseSite();
    const siteData = site.data?.site;
    const siteUrl = siteData?.url ?? window.location.origin;
    const api = new ActivityPubAPI(
        new URL(siteUrl),
        new URL('/ghost/api/admin/identities/', window.location.origin),
        handle
    );
    return useQuery({
        queryKey: [`followersCount:${handle}`],
        async queryFn() {
            return api.getFollowersCount();
        }
    });
}

function useFollowingCountForUser(handle: string) {
    const site = useBrowseSite();
    const siteData = site.data?.site;
    const siteUrl = siteData?.url ?? window.location.origin;
    const api = new ActivityPubAPI(
        new URL(siteUrl),
        new URL('/ghost/api/admin/identities/', window.location.origin),
        handle
    );
    return useQuery({
        queryKey: [`followingCount:${handle}`],
        async queryFn() {
            return api.getFollowingCount();
        }
    });
}

const Profile: React.FC<ProfileProps> = ({}) => {
    const {data: followersCount = 0} = useFollowersCountForUser('index');
    const {data: followingCount = 0} = useFollowingCountForUser('index');

    type ProfileTab = 'posts' | 'likes' | 'following' | 'followers';

    const [selectedTab, setSelectedTab] = useState<ProfileTab>('posts');

    const tabs = [
        {
            id: 'posts',
            title: 'Posts',
            contents: (<div><NoValueLabel icon='pen'>
                You haven’t posted anything yet.
            </NoValueLabel></div>),
            counter: 240
        },
        {
            id: 'likes',
            title: 'Likes',
            contents: (<div><NoValueLabel icon='heart'>
                You haven’t liked anything yet.
            </NoValueLabel></div>),
            counter: 27
        },
        {
            id: 'following',
            title: 'Following',
            contents: (<div><NoValueLabel icon='user-add'>
                You haven’t followed anyone yet.
            </NoValueLabel></div>),
            counter: followingCount
        },
        {
            id: 'followers',
            title: 'Followers',
            contents: (<div><NoValueLabel icon='user-add'>
                Nobody’s following you yet. Their loss!
            </NoValueLabel></div>),
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

                    {/* <div className='grid grid-cols-2 gap-4'>
                        <div className='group/stat flex cursor-pointer flex-col gap-1' onClick={() => updateRoute('/profile/following')}>
                            <span className='text-3xl font-bold leading-none' data-test-following-count>{followingCount}</span>
                            <span className='text-base leading-none text-grey-800 group-hover/stat:text-grey-900' data-test-following-modal>Following<span className='ml-1 opacity-0 transition-opacity group-hover/stat:opacity-100'>&rarr;</span></span>
                        </div>
                        <div className='group/stat flex cursor-pointer flex-col gap-1' onClick={() => updateRoute('/profile/followers')}>
                            <span className='text-3xl font-bold leading-none' data-test-following-count>{followersCount}</span>
                            <span className='text-base leading-none text-grey-800 group-hover/stat:text-grey-900' data-test-followers-modal>Followers<span className='ml-1 opacity-0 transition-opacity group-hover/stat:opacity-100'>&rarr;</span></span>
                        </div>
                    </div> */}
                </div>
            </div>
        </>
    );
};

export default Profile;