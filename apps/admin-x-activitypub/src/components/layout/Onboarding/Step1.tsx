import APAvatar from '@src/components/global/APAvatar';
import React, {useState} from 'react';
import apNodes from '@assets/images/onboarding/ap-nodes.png';
import apNodesDark from '@assets/images/onboarding/ap-nodes-dark.png';
import {Button, H3, LucideIcon, Skeleton} from '@tryghost/shade';
import {useAccountForUser} from '@src/hooks/use-activity-pub-queries';
import {useBrowseUsers} from '@tryghost/admin-x-framework/api/users';
import {useNavigate} from '@tryghost/admin-x-framework';

const Step1: React.FC = () => {
    const {data: account} = useAccountForUser('index', 'me');
    const {data: {users, meta} = {users: []}, isLoading: usersLoading} = useBrowseUsers();
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);

    const firstThreeUsers = users.slice(0, 3);
    const transformedUsers = firstThreeUsers.map(user => ({
        id: user.id,
        icon: {
            url: user.profile_image as string
        },
        name: user.name
    }));

    const handleCopy = async () => {
        if (account?.handle) {
            setCopied(true);
            await navigator.clipboard.writeText(account.handle);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className='relative h-full overflow-hidden'>
            <div className='isolate flex h-full flex-col items-stretch justify-between'>
                <div className='relative z-20 flex justify-between px-14'>
                    <div className='flex flex-col gap-4 pb-20 text-xl font-medium'>
                        <h1 className='max-w-sm text-[3.6rem] tracking-[-.025em]'>Increase your reach, with the social web.</h1>
                        <div className='flex max-w-[600px] flex-col gap-4'>
                            <p className='text-gray-800 dark:text-gray-600'>In addition to your website, email newsletter and RSS feeds, Ghost now shares posts to the social web – so millions of users across Flipboard, Mastodon, Threads, Bluesky and WordPress can find & follow your work.</p>
                            <p>{account ? <><strong>{account.name}</strong> is now part of the world’s largest open network.</> : <Skeleton className='w-full max-w-md' />}</p>
                        </div>
                    </div>
                    <Button className={`min-w-60 bg-gradient-to-r from-purple-500 to-[#6A1AD6] hover:opacity-90 dark:text-white`} size='lg' onClick={() => navigate('/welcome/2')}>Next &rarr;</Button>
                </div>
                <div className='relative z-10 h-full'>
                    <img className='absolute left-1/2 top-[calc(-280px)] w-full min-w-[1240px] max-w-[1300px] -translate-x-1/2 dark:hidden' src={apNodes} />
                    <img className='absolute left-1/2 top-[calc(-280px)] hidden w-full min-w-[1240px] max-w-[1300px] -translate-x-1/2 dark:!visible dark:!block' src={apNodesDark} />
                    <div className='relative mx-auto mt-0 flex w-96 flex-col gap-3 rounded-lg bg-white p-6 shadow-xl before:absolute before:inset-[80px] before:-z-10 before:rounded-full before:bg-[radial-gradient(circle,#4b5563,#6b7280,#9ca3af)] before:blur-[1000px] xxl:mt-[calc(-280px+20vw)] min-[1800px]:mt-14 dark:border dark:border-gray-950 dark:bg-[#101114] dark:shadow-[#1e1b4b]/5 dark:before:bg-[radial-gradient(circle,#6366f1,#a855f7,#ec4899)]'>
                        <div className='flex items-start justify-between'>
                            <APAvatar
                                author={account && {
                                    icon: {
                                        url: account?.avatarUrl
                                    },
                                    name: account?.name,
                                    handle: account?.handle
                                }}
                                size='md'
                            />
                            <span className='flex h-5 items-center gap-1 rounded-full bg-gray-100 px-3 text-[11px] font-medium uppercase text-gray-700 dark:bg-gray-925/70 dark:text-gray-500'>
                                <LucideIcon.Check className='ml-[-2px]' size={14} />
                            Following
                            </span>
                        </div>
                        <div className='flex flex-col items-start gap-1'>
                            <H3>{account?.name || <Skeleton className='w-24' />}</H3>
                            <div className={`relative -mx-3 h-8 max-w-[calc(100%+24px)] px-3 text-lg font-medium before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-r before:from-[#CFB0FF66] before:to-[#B6E8FF66] before:opacity-0 ${!usersLoading && 'before:animate-onboarding-handle-bg'} dark:before:from-[#CFB0FF20] dark:before:to-[#B6E8FF20]`}>
                                <div className='relative flex h-full items-center gap-1'>
                                    <span className='truncate'>{account?.handle || <Skeleton className='w-64' />}</span>
                                    <Button className='h-6 w-6 p-0 hover:opacity-80' variant='link' onClick={handleCopy}>
                                        {!copied ?
                                            <LucideIcon.Copy size={16} /> :
                                            <LucideIcon.Check size={16} />
                                        }
                                    </Button>
                                    <span className={`absolute right-full flex items-center gap-3 text-nowrap font-mono text-sm font-medium uppercase text-purple after:mr-3 after:h-[1.5px] after:w-24 after:scale-0 after:bg-purple after:will-change-transform after:content-[""] ${!usersLoading && 'after:animate-onboarding-handle-line'}`}><span className={`opacity-0 ${!usersLoading && 'animate-onboarding-handle-label'}`}>Your social web handle</span></span>
                                </div>
                            </div>
                        </div>
                        <p className='leading-tight text-gray-800 dark:text-gray-600'>
                            {account?.bio ? (
                                <span dangerouslySetInnerHTML={{__html: account.bio}} />
                            ) : (
                                <Skeleton count={3} randomize={true} />
                            )}
                        </p>
                        <div className='mt-1 flex gap-2 text-sm text-gray-800 dark:text-gray-600'>
                            <div className='flex [&>*:not(:first-child)]:-ml-2 [&>*:nth-child(1)]:z-30 [&>*:nth-child(2)]:z-20 [&>*:nth-child(3)]:z-10 [&>*]:pointer-events-none [&>*]:h-5 [&>*]:w-5 [&>*]:border [&>*]:border-white dark:[&>*]:border-[#101114] [&_img]:h-5 [&_img]:w-5'>
                                {transformedUsers.map(user => (
                                    <APAvatar key={user.id} author={user} disabled={true} size='xs' />
                                ))}
                            </div>
                        Authored by {firstThreeUsers[0]?.name}{(meta?.pagination.total ?? 0) > 1 && ` and ${(meta?.pagination.total ?? 1) - 1} others`}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Step1;
