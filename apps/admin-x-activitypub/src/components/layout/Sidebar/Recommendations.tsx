import * as React from 'react';
import APAvatar from '@components/global/APAvatar';
import ActivityItem from '@components/activities/ActivityItem';
import Separator from '@components/global/Separator';
import getName from '@utils/get-name';
import getUsername from '@utils/get-username';
import {Skeleton} from '@tryghost/shade';
import {handleProfileClick} from '@utils/handle-profile-click';
import {useSuggestedProfilesForUser} from '@hooks/use-activity-pub-queries';

const Recommendations: React.FC = () => {
    const {suggestedProfilesQuery} = useSuggestedProfilesForUser('index', 3);
    const {data: suggestedData, isLoading: isLoadingSuggested} = suggestedProfilesQuery;
    const suggested = suggestedData || Array(3).fill({actor: {}});

    return (
        <div>
            <h2 className='mb-1 text-lg font-semibold'>Suggestions to follow</h2>
            <ul className='grow'>
                {suggested.map((profile, index) => {
                    const actor = profile.actor;
                    return (
                        <React.Fragment key={actor.id}>
                            <li key={actor.id}>
                                <ActivityItem
                                    onClick={() => handleProfileClick(actor)}
                                >
                                    {!isLoadingSuggested ? <APAvatar author={actor} /> : <Skeleton className='z-10 h-10 w-10' />}
                                    <div className='flex min-w-0 flex-col'>
                                        <span className='block w-full truncate font-semibold text-black'>{!isLoadingSuggested ? getName(actor) : <Skeleton className='w-24' />}</span>
                                        <span className='block w-full truncate text-sm text-gray-600'>{!isLoadingSuggested ? getUsername(actor) : <Skeleton className='w-40' />}</span>
                                    </div>
                                </ActivityItem>
                            </li>
                            {index < suggested.length - 1 && <Separator />}
                        </React.Fragment>
                    );
                })}
            </ul>
            {/* <Button className='mt-2 w-full' variant='outline' onClick={() => updateRoute('search')}>Explore &rarr;</Button> */}
        </div>
    );
};

export default Recommendations;