import APAvatar from './global/APAvatar';
import ActivityItem from './activities/ActivityItem';
import MainNavigation from './navigation/MainNavigation';
import React from 'react';
import {Button, Icon} from '@tryghost/admin-x-design-system';

interface SearchProps {}

const Search: React.FC<SearchProps> = ({}) => {
    return (
        <>
            <MainNavigation title='Search' />
            <div className='z-0 flex w-full flex-col items-center pt-8'>
                <div className='mb-6 flex w-full max-w-[560px] items-center gap-2 rounded-full bg-grey-100 px-3 py-2 text-grey-500'><Icon name='magnifying-glass' size={18} />Search the Fediverse</div>
                <ActivityItem>
                    <APAvatar/>
                    <div>
                        <div className='text-grey-600'><span className='font-bold text-black'>Lydia Mango</span> @username@domain.com</div>
                        <div className='text-sm'>1,535 followers</div>
                    </div>
                    <Button className='ml-auto' label='Follow' link />
                </ActivityItem>
                <ActivityItem>
                    <APAvatar/>
                    <div>
                        <div className='text-grey-600'><span className='font-bold text-black'>Tiana Passaquindici Arcand</span> @username@domain.com</div>
                        <div className='text-sm'>4,545 followers</div>
                    </div>
                    <Button className='ml-auto' label='Follow' link />
                </ActivityItem>
                <ActivityItem>
                    <APAvatar/>
                    <div>
                        <div className='text-grey-600'><span className='font-bold text-black'>Gretchen Press</span> @username@domain.com</div>
                        <div className='text-sm'>1,156 followers</div>
                    </div>
                    <Button className='ml-auto' label='Follow' link />
                </ActivityItem>
                <ActivityItem>
                    <APAvatar/>
                    <div>
                        <div className='text-grey-600'><span className='font-bold text-black'>Leo Lubin</span> @username@domain.com</div>
                        <div className='text-sm'>1,584 followers</div>
                    </div>
                    <Button className='ml-auto' label='Follow' link />
                </ActivityItem>
            </div>
        </>
    );
};

export default Search;