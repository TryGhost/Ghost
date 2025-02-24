import * as React from 'react';
import APAvatar from '@components/global/APAvatar';
import ActivityItem from '@components/activities/ActivityItem';
import getName from '@utils/get-name';
import getUsername from '@utils/get-username';
import {H4, LucideIcon, Skeleton} from '@tryghost/shade';
import {Link} from '@tryghost/admin-x-framework';
import {handleProfileClick} from '@utils/handle-profile-click';
import {useSuggestedProfilesForUser} from '@hooks/use-activity-pub-queries';

const Recommendations: React.FC = () => {
    const {suggestedProfilesQuery} = useSuggestedProfilesForUser('index', 3);
    const {data: suggestedData, isLoading: isLoadingSuggested} = suggestedProfilesQuery;
    const suggested = suggestedData || Array(3).fill({actor: {}});

    return (
        <div className='px-3'>
            <div className='mb-3 flex flex-col gap-0.5'>
                <div className='flex items-center gap-2'>
                    <LucideIcon.Globe className='text-purple-500' size={20} strokeWidth={1.5} />
                    <H4>Follow suggestions</H4>
                </div>
                <span className='text-sm text-gray-600'>
                    Accounts you might be interested in
                </span>
            </div>
            <ul className='grow'>
                {suggested.map((profile) => {
                    const actor = profile.actor;
                    return (
                        <React.Fragment key={actor.id}>
                            <li key={actor.id}>
                                <ActivityItem
                                    onClick={() => handleProfileClick(actor)}
                                >
                                    {!isLoadingSuggested ? <APAvatar author={actor} /> : <Skeleton className='z-10 h-10 w-10' />}
                                    <div className='flex min-w-0  flex-col'>
                                        <span className='block max-w-[190px] truncate font-semibold text-black dark:text-white'>{!isLoadingSuggested ? getName(actor) : <Skeleton className='w-24' />}</span>
                                        <span className='block max-w-[190px] truncate text-sm text-gray-600'>{!isLoadingSuggested ? getUsername(actor) : <Skeleton className='w-40' />}</span>
                                    </div>
                                </ActivityItem>
                            </li>
                        </React.Fragment>
                    );
                })}
            </ul>
            <Link className='mt-2 inline-block p-0 py-2 text-md font-semibold text-purple-500' to="/search">Find more &rarr;</Link>
        </div>
    );
};

export default Recommendations;
