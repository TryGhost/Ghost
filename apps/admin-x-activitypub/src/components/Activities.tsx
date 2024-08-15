import APAvatar from './global/APAvatar';
import ActivityItem from './activities/ActivityItem';
import MainNavigation from './navigation/MainNavigation';
import React from 'react';

interface ActivitiesProps {}

const Activities: React.FC<ActivitiesProps> = ({}) => {
    // const fakeAuthor =
    return (
        <>
            <MainNavigation />
            <div className='z-0 flex w-full flex-col items-center'>
                <div className='mt-8 flex w-full max-w-[560px] flex-col'>
                    <ActivityItem>
                        <APAvatar />
                        <div>
                            <div className='text-grey-600'><span className='font-bold text-black'>Lydia Mango</span> @username@domain.com</div>
                            <div className='text-sm'>Followed you</div>
                        </div>
                    </ActivityItem>

                    <ActivityItem>
                        <APAvatar />
                        <div>
                            <div className='text-grey-600'><span className='font-bold text-black'>Tiana Passaquindici Arcand</span> @username@domain.com</div>
                            <div className='text-sm'>Followed you</div>
                        </div>
                    </ActivityItem>

                    <ActivityItem>
                        <APAvatar />
                        <div>
                            <div className='text-grey-600'><span className='font-bold text-black'>Gretchen Press</span> @username@domain.com</div>
                            <div className='text-sm'>Followed you</div>
                        </div>
                    </ActivityItem>

                    <ActivityItem>
                        <APAvatar />
                        <div>
                            <div className='text-grey-600'><span className='font-bold text-black'>Leo Lubin</span> @username@domain.com</div>
                            <div className='text-sm'>Followed you</div>
                        </div>
                    </ActivityItem>
                </div>
            </div>
        </>
    );
};

export default Activities;