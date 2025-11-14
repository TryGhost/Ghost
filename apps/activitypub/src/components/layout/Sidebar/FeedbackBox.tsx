import React from 'react';
import {Button, H4, LucideIcon} from '@tryghost/shade';
import {useNavigateWithBasePath} from '@src/hooks/use-navigate-with-base-path';

const FeedbackBox: React.FC = () => {
    const navigate = useNavigateWithBasePath();

    function showFeedbackReply() {
        const targetPostId = 'https://activitypub.ghost.org/.ghost/activitypub/note/6d6d7f57-b656-4caa-ba9e-efa1d9a4b3fb';
        navigate(`/notes/${encodeURIComponent(targetPostId)}`);
    }

    return (
        <div className='z-20 w-full bg-white dark:bg-black'>
            <div className='flex w-full flex-col gap-0.5 border-t border-gray-200 bg-white px-3 pt-6 dark:border-gray-950 dark:bg-black'>
                <div className='flex items-center gap-2'>
                    <LucideIcon.MessageSquare className='text-purple-500' size={20} strokeWidth={1.5} />
                    <H4>Beta feedback</H4>
                </div>
                <span className='text-sm text-gray-700 dark:text-gray-600'>
                Something not working? Let us know
                </span>
                <Button className='mt-2 dark:bg-gray-925/70 dark:hover:bg-gray-900' variant='secondary' onClick={showFeedbackReply}>Send feedback</Button>
            </div>
            <div className='-mb-1 ml-3 flex items-center gap-1.5 pb-2 pt-4 text-xs text-gray-400'>
                <a className='text-xs font-medium text-gray-700 hover:text-black dark:text-gray-600 dark:hover:text-white' href="https://ghost.org/help/social-web/" rel="noreferrer" target="_blank">Help</a>
                &sdot;
                <a className='text-xs font-medium text-gray-700 hover:text-black dark:text-gray-600 dark:hover:text-white' href="https://activitypub.ghost.org/archive" rel="noreferrer"target="_blank">Updates</a>
            </div>
        </div>
    );
};

export default FeedbackBox;
