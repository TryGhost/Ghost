import React from 'react';
import {Button, H4, LucideIcon} from '@tryghost/shade';

const FeedbackBox: React.FC = () => {
    return (
        <div className='sticky bottom-0 z-20 w-full bg-white'>
            <div className='flex w-full flex-col gap-0.5 border-t border-gray-200 bg-white px-3 pt-6'>
                <div className='flex items-center gap-2'>
                    <LucideIcon.MessageSquare className='text-purple-500' size={20} strokeWidth={1.5} />
                    <H4>Beta feedback</H4>
                </div>
                <span className='text-sm text-gray-700'>
                Something not working?
                </span>
                <Button className='mt-2' variant='secondary'>Send feedback</Button>
            </div>
            <div className='-mb-1 ml-3 flex items-center gap-1.5 pt-4 text-xs text-gray-400'>
                <a className='text-xs font-medium text-gray-700 hover:text-black dark:text-gray-800 dark:hover:text-white' href="https://ghost.org/help/social-web/" rel="noreferrer" target="_blank">Help</a>
                &sdot;
                <a className='text-xs font-medium text-gray-700 hover:text-black dark:text-gray-800 dark:hover:text-white' href="https://activitypub.ghost.org/archive" rel="noreferrer"target="_blank">Updates</a>
            </div>
        </div>
    );
};

export default FeedbackBox;