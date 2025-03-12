import APAvatar from '@src/components/global/APAvatar';
import React from 'react';
import {Button, H3, LucideIcon} from '@tryghost/shade';
import {useAccountForUser} from '@src/hooks/use-activity-pub-queries';
import {useBrowseUsers} from '@tryghost/admin-x-framework/api/users';

const Step1: React.FC<{ onNext: () => void }> = ({onNext}) => {
    const {data: account} = useAccountForUser('index');
    const {data: {users, meta} = {users: []}, isLoading: usersLoading} = useBrowseUsers();
    const firstThreeUsers = users.slice(0, 3);

    return (
        <div className='relative h-full'>
            <div className='absolute inset-0 -mx-14 -mt-14 bg-[url(/ghost/assets/img/ap-nodes.png)] bg-cover bg-center bg-no-repeat' />
            <div className='relative flex justify-between'>
                <div className='flex flex-col gap-4 text-xl font-medium'>
                    <h1 className='max-w-sm'>Increase your reach, with the social web.</h1>
                    <div className='flex max-w-[600px] flex-col gap-4'>
                        <p className='text-gray-800 dark:text-gray-600'>In addition to your website, email newsletter and RSS feeds, Ghost now shares posts to the social web – so millions of users across Flipboard, Mastodon, Threads, Bluesky and WordPress can find & follow your work.</p>
                        <p><strong>{account?.name}</strong> is now part of the world’s largest open network.</p>
                    </div>
                </div>
                <Button className={`min-w-60 bg-gradient-to-r from-purple-500 to-purple-600 ${!usersLoading && 'animate-onboarding-next-button'} opacity-0`} size='lg' onClick={onNext}>Next →</Button>
            </div>
            <div className='relative mx-auto mt-40 flex w-96 flex-col gap-3 rounded-lg bg-white p-6 shadow-xl'>
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
                    <H3>{account?.name}</H3>
                    <div className={`relative -ml-3 h-8 px-3 text-lg font-medium before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-r before:from-[#CFB0FF] before:to-[#B6E8FF] before:opacity-0 ${!usersLoading && 'before:animate-onboarding-handle-bg'}`}>
                        <div className='relative flex h-full items-center gap-1'>
                            <span>{account?.handle}</span>
                            <LucideIcon.Copy size={16} />
                            <span className={`absolute right-full flex items-center gap-3 text-nowrap font-mono text-xs font-medium uppercase text-purple after:mr-3 after:h-[1.5px] after:w-24 after:scale-0 after:bg-purple after:content-[""] ${!usersLoading && 'after:animate-onboarding-handle-line'}`}><span className={`opacity-0 ${!usersLoading && 'animate-onboarding-handle-label'}`}>Your social web handle</span></span>
                        </div>
                    </div>
                </div>
                <p className='leading-tight text-gray-800 dark:text-gray-600'>{account?.bio}</p>
                <div className='mt-1 flex gap-2 text-sm text-gray-800 dark:text-gray-600'>
                    <div className='flex [&>*:nth-child(1)]:z-30 [&>*:nth-child(2)]:z-20 [&>*:nth-child(3)]:z-10'>
                        {firstThreeUsers.map((user, index) => (
                            <img
                                key={user.id}
                                alt={user.name}
                                className={`${index > 0 && '-ml-2'} relative h-5 w-5 rounded-full border border-white`}
                                src={user.profile_image || '/default-avatar.png'}
                            />
                        ))}
                    </div>
                    Authored by {firstThreeUsers[0]?.name}{(meta?.pagination.total ?? 0) > 1 && ` and ${(meta?.pagination.total ?? 1) - 1} others`}
                </div>
            </div>
        </div>
    );
};

export default Step1;
