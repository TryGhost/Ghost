import MainNavigation from './navigation/MainNavigation';
import React from 'react';
import {Icon} from '@tryghost/admin-x-design-system';

interface SearchProps {}

const Search: React.FC<SearchProps> = ({}) => {
    return (
        <>
            <MainNavigation />
            <div className='z-0 flex w-full flex-col items-center pt-8'>
                <div className='flex w-full max-w-[560px] items-center gap-2 rounded-full bg-grey-100 px-3 py-2 text-grey-500'><Icon name='magnifying-glass' size={18} />Search the Fediverse</div>
            </div>
        </>
    );
};

export default Search;