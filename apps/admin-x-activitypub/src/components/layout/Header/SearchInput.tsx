import React from 'react';
import {LucideIcon} from '@tryghost/shade';

const SearchInput: React.FC = () => {
    return (
        <div className='inline-flex h-9 w-full items-center justify-start gap-2 rounded-full bg-gray-100 px-3 text-md font-normal text-gray-600 hover:bg-gray-200 hover:text-gray-600 dark:bg-gray-925/70 dark:text-gray-700 dark:hover:bg-gray-925 [&_svg]:size-[18px]'>
            <LucideIcon.Search size={18} strokeWidth={1.5} /> Search the social web
        </div>
    );
};

export default SearchInput;
