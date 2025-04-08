import * as React from 'react';
import APAvatar from '@components/global/APAvatar';
import ActivityItem from '@components/activities/ActivityItem';
import {Button, H4, LucideIcon, Skeleton} from '@tryghost/shade';
import {handleProfileClickRR} from '@utils/handle-profile-click';
import {useNavigate, useNavigationStack} from '@tryghost/admin-x-framework';
import {useSuggestedProfilesForUser} from '@hooks/use-activity-pub-queries';

const Recommendations: React.FC = () => {
    const {suggestedProfilesQuery} = useSuggestedProfilesForUser('index', 3);
    const {data: suggestedData, isLoading: isLoadingSuggested} = suggestedProfilesQuery;
    const suggested = isLoadingSuggested ? Array(3).fill(null) : (suggestedData || []);
    const navigate = useNavigate();
    const {resetStack} = useNavigationStack();

    const hideClassName = '[@media(max-height:740px)]:hidden';

    return (
        <div className={`border-t border-gray-200 px-3 pt-6 dark:border-gray-950 ${hideClassName}`}>
            <div className='mb-3 flex flex-col gap-0.5'>
                <div className='flex items-center gap-2'>
                    <LucideIcon.Globe className='text-purple-500' size={20} strokeWidth={1.5} />
                    <H4>Follow suggestions</H4>
                </div>
                <span className='text-sm text-gray-700'>
                    Accounts you might be interested in
                </span>
            </div>
            <ul className='grow'>
                {suggested.map((profile, index) => {
                    const actorId = profile?.id || `loading-${index}`;
                    const actorName = profile?.name || '';
                    const actorHandle = profile?.handle || '';
                    const actorAvatarUrl = profile?.avatarUrl || '';

                    let className;
                    switch (index) {
                    case 0:
                        className = '[@media(max-height:740px)]:hidden';
                        break;
                    case 1:
                        className = '[@media(max-height:800px)]:hidden';
                        break;
                    case 2:
                        className = '[@media(max-height:860px)]:hidden';
                        break;
                    }

                    return (
                        <React.Fragment key={actorId}>
                            <li key={actorId} className={className}>
                                <ActivityItem onClick={() => {
                                    if (!isLoadingSuggested && profile) {
                                        handleProfileClickRR(profile, navigate);
                                    }
                                }}>
                                    {!isLoadingSuggested ? <APAvatar author={
                                        {
                                            icon: {
                                                url: actorAvatarUrl
                                            },
                                            name: actorName,
                                            handle: actorHandle
                                        }
                                    } /> : <Skeleton className='z-10 size-10' />}
                                    <div className='flex min-w-0  flex-col'>
                                        <span className='block max-w-[190px] truncate font-semibold text-black dark:text-white'>{!isLoadingSuggested ? actorName : <Skeleton className='w-24' />}</span>
                                        <span className='block max-w-[190px] truncate text-sm text-gray-600'>{!isLoadingSuggested ? actorHandle : <Skeleton className='w-40' />}</span>
                                    </div>
                                </ActivityItem>
                            </li>
                        </React.Fragment>
                    );
                })}
            </ul>
            <Button className='p-0 font-medium text-purple' variant='link' onClick={() => {
                resetStack();
                navigate('/explore');
            }}>Find more &rarr;</Button>
        </div>
    );
};

export default Recommendations;
