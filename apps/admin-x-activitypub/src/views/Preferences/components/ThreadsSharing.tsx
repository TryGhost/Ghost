import Layout from '@src/components/layout';
import React, {useState} from 'react';
import {Button, H3, LucideIcon} from '@tryghost/shade';
import {useLocation} from '@tryghost/admin-x-framework';

const ThreadsSharing: React.FC = () => {
    const [enabled, setEnabled] = useState(false);
    const {state: {account}} = useLocation();

    const handle = account.handle;
    const convertedHandle = handle.replace('@', '');

    const handleEnable = () => {
        setEnabled(true);
    };

    return (
        <Layout>
            <div className='mx-auto max-w-[620px] px-6 py-12'>
                <div className='flex items-center justify-between gap-8'>
                    <H3>Enable Threads sharing</H3>
                    {!enabled ?
                        <Button className='min-w-20' onClick={handleEnable}>Enable</Button> :
                        <Button className='text-green pointer-events-none -mr-3 min-w-20' variant='link'>
                            <LucideIcon.Check />
                            Enabled
                        </Button>
                    }
                </div>
                {!enabled ?
                    <p className='mt-6 text-sm'>Connect your account to Threads to share your content directly to your Threads profile. When enabled, new posts you create can be automatically shared to your Threads account, expanding your reach across platforms.</p> :
                    <>
                        <div className='bg-gray-150 mt-6 flex items-center rounded-lg p-5'>
                            <svg fill="#000000" height="32" viewBox="0 0 16 16" width="32" xmlns="http://www.w3.org/2000/svg"><path d="M6.321 6.016c-0.27 -0.18 -1.166 -0.802 -1.166 -0.802 0.756 -1.081 1.753 -1.502 3.132 -1.502 0.975 0 1.803 0.327 2.394 0.948s0.928 1.509 1.005 2.644q0.492 0.207 0.905 0.484c1.109 0.745 1.719 1.86 1.719 3.137 0 2.716 -2.226 5.075 -6.256 5.075C4.594 16 1 13.987 1 7.994 1 2.034 4.482 0 8.044 0 9.69 0 13.55 0.243 15 5.036l-1.36 0.353C12.516 1.974 10.163 1.43 8.006 1.43c-3.565 0 -5.582 2.171 -5.582 6.79 0 4.143 2.254 6.343 5.63 6.343 2.777 0 4.847 -1.443 4.847 -3.556 0 -1.438 -1.208 -2.127 -1.27 -2.127 -0.236 1.234 -0.868 3.31 -3.644 3.31 -1.618 0 -3.013 -1.118 -3.013 -2.582 0 -2.09 1.984 -2.847 3.55 -2.847 0.586 0 1.294 0.04 1.663 0.114 0 -0.637 -0.54 -1.728 -1.9 -1.728 -1.25 0 -1.566 0.405 -1.967 0.868ZM8.716 8.19c-2.04 0 -2.304 0.87 -2.304 1.416 0 0.878 1.043 1.168 1.6 1.168 1.02 0 2.067 -0.282 2.232 -2.423a6.2 6.2 0 0 0 -1.528 -0.161" strokeWidth="1"></path></svg>
                            <div className='ml-4 flex grow flex-col'>
                                <span className='text-sm'>Threads handle</span>
                                <span className='text-lg font-medium'>{convertedHandle}</span>
                            </div>
                            <a className='flex items-center gap-1 font-medium' href={`https://www.threads.net/fediverse_profile/${convertedHandle}`} rel='noreferrer' target='_blank'>
                                Go to profile
                                <LucideIcon.ExternalLink size={14} />
                            </a>
                        </div>
                        <p className='mt-4 text-sm'>Your content is now being shared to Threads. This connection creates a dedicated account on Threads that displays the content you publish on Ghost.</p>
                    </>
                }
            </div>
        </Layout>
    );
};

export default ThreadsSharing;
