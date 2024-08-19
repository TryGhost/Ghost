import MainNavigation from './navigation/MainNavigation';
import React from 'react';
import {ActivityPubAPI} from '../api/activitypub';
import {SettingValue} from '@tryghost/admin-x-design-system';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useQuery} from '@tanstack/react-query';
import {useRouting} from '@tryghost/admin-x-framework/routing';

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
    const {updateRoute} = useRouting();
    const {data: followersCount = 0} = useFollowersCountForUser('index');
    const {data: followingCount = 0} = useFollowingCountForUser('index');

    return (
        <>
            <MainNavigation />
            <div className='z-0 flex w-full flex-col items-center'>
                <div className='mx-auto mt-8 w-full max-w-[560px] rounded-xl bg-grey-50 p-6' id='ap-sidebar'>
                    <div className='mb-4 border-b border-b-grey-200 pb-4'><SettingValue key={'your-username'} heading={'Your username'} value={'@index@localplaceholder.com'}/></div>
                    <div className='grid grid-cols-2 gap-4'>
                        <div className='group/stat flex cursor-pointer flex-col gap-1' onClick={() => updateRoute('/profile/following')}>
                            <span className='text-3xl font-bold leading-none' data-test-following-count>{followingCount}</span>
                            <span className='text-base leading-none text-grey-800 group-hover/stat:text-grey-900' data-test-following-modal>Following<span className='ml-1 opacity-0 transition-opacity group-hover/stat:opacity-100'>&rarr;</span></span>
                        </div>
                        <div className='group/stat flex cursor-pointer flex-col gap-1' onClick={() => updateRoute('/profile/followers')}>
                            <span className='text-3xl font-bold leading-none' data-test-following-count>{followersCount}</span>
                            <span className='text-base leading-none text-grey-800 group-hover/stat:text-grey-900' data-test-followers-modal>Followers<span className='ml-1 opacity-0 transition-opacity group-hover/stat:opacity-100'>&rarr;</span></span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Profile;