import Layout from '@src/components/layout';
import React, {useState} from 'react';
import {Button, H3, LucideIcon} from '@tryghost/shade';
import {useLocation} from '@tryghost/admin-x-framework';

const BlueskySharing: React.FC = () => {
    const [enabled, setEnabled] = useState(false);
    const {state: {account}} = useLocation();

    const handle = account.handle;
    const convertedHandle = handle.replace(/@([^@]+)@/, '$1.');

    const handleEnable = () => {
        setEnabled(true);
    };

    return (
        <Layout>
            <div className='mx-auto max-w-[620px] px-6 py-12'>
                <div className='flex items-center justify-between gap-8'>
                    <H3>Enable Bluesky sharing</H3>
                    {!enabled ?
                        <Button className='min-w-20' onClick={handleEnable}>Enable</Button> :
                        <Button className='text-green pointer-events-none -mr-3 min-w-20' variant='link'>
                            <LucideIcon.Check />
                            Enabled
                        </Button>
                    }
                </div>
                {!enabled ?
                    <p className='mt-6 text-sm'>Connect your account to Bluesky to share your content directly to your Bluesky profile. When enabled, new posts you create can be automatically shared to your Bluesky account, expanding your reach across platforms.</p> :
                    <>
                        <div className='bg-gray-150 mt-6 flex items-center rounded-lg p-5'>
                            <svg height="32" role="img" viewBox="0 0 24 24" width="32" xmlns="http://www.w3.org/2000/svg"><path d="M12 10.8c-1.087 -2.114 -4.046 -6.053 -6.798 -7.995C2.566 0.944 1.561 1.266 0.902 1.565 0.139 1.908 0 3.08 0 3.768c0 0.69 0.378 5.65 0.624 6.479 0.815 2.736 3.713 3.66 6.383 3.364 0.136 -0.02 0.275 -0.039 0.415 -0.056 -0.138 0.022 -0.276 0.04 -0.415 0.056 -3.912 0.58 -7.387 2.005 -2.83 7.078 5.013 5.19 6.87 -1.113 7.823 -4.308 0.953 3.195 2.05 9.271 7.733 4.308 4.267 -4.308 1.172 -6.498 -2.74 -7.078a8.741 8.741 0 0 1 -0.415 -0.056c0.14 0.017 0.279 0.036 0.415 0.056 2.67 0.297 5.568 -0.628 6.383 -3.364 0.246 -0.828 0.624 -5.79 0.624 -6.478 0 -0.69 -0.139 -1.861 -0.902 -2.206 -0.659 -0.298 -1.664 -0.62 -4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z" fill="#0385FF" strokeWidth="1"></path></svg>
                            <div className='ml-4 flex grow flex-col'>
                                <span className='text-sm'>Bluesky handle</span>
                                <span className='text-lg font-medium'>@{convertedHandle}.ap.brid.gy</span>
                            </div>
                            <a className='flex items-center gap-1 font-medium' href={`https://bsky.app/profile/${convertedHandle}.ap.brid.gy`} rel='noreferrer' target='_blank'>
                                Go to profile
                                <LucideIcon.ExternalLink size={14} />
                            </a>
                        </div>
                        <p className='mt-4 text-sm'>Your content is now being shared to Bluesky. This connection creates a dedicated account on Bluesky that displays the content you publish on Ghost.</p>
                    </>
                }
            </div>
        </Layout>
    );
};

export default BlueskySharing;
