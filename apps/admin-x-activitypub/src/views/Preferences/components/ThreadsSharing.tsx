import APAvatar from '@src/components/global/APAvatar';
import Layout from '@src/components/layout';
import React, {useState} from 'react';
import {Button, H2, H3, LucideIcon} from '@tryghost/shade';
import {LoadingIndicator} from '@tryghost/admin-x-design-system';
import {useFollowMutationForUser, useSearchForUser} from '@hooks/use-activity-pub-queries';
import {useLocation} from '@tryghost/admin-x-framework';

const ThreadsSharing: React.FC = () => {
    const {state: {account, threadsAccount, isEnabled}} = useLocation();
    const [enabled, setEnabled] = useState(isEnabled);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const {updateAccountSearchResult} = useSearchForUser('index', threadsAccount.handle);

    const handleCopy = async () => {
        setCopied(true);
        await navigator.clipboard.writeText(convertedHandle);
        setTimeout(() => setCopied(false), 2000);
    };

    const followMutation = useFollowMutationForUser('index',
        () => {
            setEnabled(true);
            setLoading(false);
            updateAccountSearchResult(threadsAccount.id, {followedByMe: true});
        },
        () => {
            setEnabled(false);
            setLoading(false);
            updateAccountSearchResult(threadsAccount.id, {followedByMe: false});
        }
    );

    const handle = account.handle;
    const convertedHandle = handle.replace('@', '');

    const handleEnable = () => {
        setLoading(true);
        followMutation.mutate('@ghost@threads.net');
    };

    return (
        <Layout>
            <div className='mx-auto max-w-[620px] px-6 py-12'>
                <div className='flex items-center justify-between gap-8'>
                    <H2>Threads sharing</H2>
                    {enabled && <span className='flex items-center gap-1 font-medium text-green'><LucideIcon.Check size={20} /> Enabled</span>}
                </div>
                {!enabled ?
                    <div className='mt-3 flex flex-col gap-5'>
                        <p className='text-base'>Connect your account to Threads to share your content directly to your Threads profile. When enabled, new posts you create can be automatically shared to your Threads account, expanding your reach across platforms.</p>
                        <Button className='h-10 text-base' disabled={loading} variant='secondary' onClick={handleEnable}>
                            {!loading ?
                                <><svg fill="#000000" height="32" viewBox="0 0 16 16" width="32" xmlns="http://www.w3.org/2000/svg"><path d="M6.321 6.016c-0.27 -0.18 -1.166 -0.802 -1.166 -0.802 0.756 -1.081 1.753 -1.502 3.132 -1.502 0.975 0 1.803 0.327 2.394 0.948s0.928 1.509 1.005 2.644q0.492 0.207 0.905 0.484c1.109 0.745 1.719 1.86 1.719 3.137 0 2.716 -2.226 5.075 -6.256 5.075C4.594 16 1 13.987 1 7.994 1 2.034 4.482 0 8.044 0 9.69 0 13.55 0.243 15 5.036l-1.36 0.353C12.516 1.974 10.163 1.43 8.006 1.43c-3.565 0 -5.582 2.171 -5.582 6.79 0 4.143 2.254 6.343 5.63 6.343 2.777 0 4.847 -1.443 4.847 -3.556 0 -1.438 -1.208 -2.127 -1.27 -2.127 -0.236 1.234 -0.868 3.31 -3.644 3.31 -1.618 0 -3.013 -1.118 -3.013 -2.582 0 -2.09 1.984 -2.847 3.55 -2.847 0.586 0 1.294 0.04 1.663 0.114 0 -0.637 -0.54 -1.728 -1.9 -1.728 -1.25 0 -1.566 0.405 -1.967 0.868ZM8.716 8.19c-2.04 0 -2.304 0.87 -2.304 1.416 0 0.878 1.043 1.168 1.6 1.168 1.02 0 2.067 -0.282 2.232 -2.423a6.2 6.2 0 0 0 -1.528 -0.161" strokeWidth="1"></path></svg>
                                Enable Threads sharing</> :
                                <LoadingIndicator size='sm' />
                            }
                        </Button>
                    </div> :
                    <>
                        <p className='mt-3 text-base'>Your content is now being shared to Threads. To view your Threads profile, you&apos;ll need to enable the <a className='text-purple' href="https://www.threads.net/settings/fediverse" rel="noreferrer" target="_blank">Fediverse beta</a> feature in your Threads account. Please note that Thread&apos;s Fediverse features are not available for users in the EU.</p>
                        <div className='mt-6 flex flex-col items-center gap-4 rounded-lg border border-gray-200 p-8 dark:border-gray-950'>
                            <div className='relative'>
                                <APAvatar
                                    author={
                                        {
                                            icon: {
                                                url: account.avatarUrl || ''
                                            },
                                            name: account.name || '',
                                            handle: account.handle
                                        }
                                    }
                                    size='md'
                                />
                                <div className='absolute bottom-0 right-0 z-10 flex size-6 items-center justify-center rounded-full bg-white shadow-xs'>
                                    <svg fill="#000000" height="14" viewBox="0 0 16 16" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M6.321 6.016c-0.27 -0.18 -1.166 -0.802 -1.166 -0.802 0.756 -1.081 1.753 -1.502 3.132 -1.502 0.975 0 1.803 0.327 2.394 0.948s0.928 1.509 1.005 2.644q0.492 0.207 0.905 0.484c1.109 0.745 1.719 1.86 1.719 3.137 0 2.716 -2.226 5.075 -6.256 5.075C4.594 16 1 13.987 1 7.994 1 2.034 4.482 0 8.044 0 9.69 0 13.55 0.243 15 5.036l-1.36 0.353C12.516 1.974 10.163 1.43 8.006 1.43c-3.565 0 -5.582 2.171 -5.582 6.79 0 4.143 2.254 6.343 5.63 6.343 2.777 0 4.847 -1.443 4.847 -3.556 0 -1.438 -1.208 -2.127 -1.27 -2.127 -0.236 1.234 -0.868 3.31 -3.644 3.31 -1.618 0 -3.013 -1.118 -3.013 -2.582 0 -2.09 1.984 -2.847 3.55 -2.847 0.586 0 1.294 0.04 1.663 0.114 0 -0.637 -0.54 -1.728 -1.9 -1.728 -1.25 0 -1.566 0.405 -1.967 0.868ZM8.716 8.19c-2.04 0 -2.304 0.87 -2.304 1.416 0 0.878 1.043 1.168 1.6 1.168 1.02 0 2.067 -0.282 2.232 -2.423a6.2 6.2 0 0 0 -1.528 -0.161" strokeWidth="1"></path></svg>
                                </div>
                            </div>
                            <div className='flex grow flex-col items-center'>
                                <H3>{account.name}</H3>
                                <div className='flex items-center gap-1'>
                                    <span className='text-lg font-medium'>{convertedHandle}</span>
                                    <Button className='size-6 p-0 hover:opacity-80' variant='link' onClick={handleCopy}>
                                        {!copied ?
                                            <LucideIcon.Copy size={16} /> :
                                            <LucideIcon.Check size={16} />
                                        }
                                    </Button>
                                </div>
                            </div>
                            <Button className='mt-2 w-full px-6' size='lg' variant='secondary' asChild>
                                <a href={`https://www.threads.net/fediverse_profile/${convertedHandle}`} rel='noreferrer' target='_blank'>
                                    Go to profile
                                    <LucideIcon.ExternalLink size={14} strokeWidth={1.25} />
                                </a>
                            </Button>
                        </div>
                    </>
                }
            </div>
        </Layout>
    );
};

export default ThreadsSharing;
