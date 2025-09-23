import APAvatar from '@src/components/global/APAvatar';
import EditProfile from '@src/views/Preferences/components/EditProfile';
import Layout from '@src/components/layout';
import React, {useState} from 'react';
import {AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    H2,
    H3,
    LoadingIndicator,
    LucideIcon,
    buttonVariants} from '@tryghost/shade';
import {toast} from 'sonner';
import {useAccountForUser, useDisableBlueskyMutationForUser, useEnableBlueskyMutationForUser} from '@hooks/use-activity-pub-queries';

const BlueskySharing: React.FC = () => {
    const {data: account, isLoading: isLoadingAccount} = useAccountForUser('index', 'me');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const enableBlueskyMutation = useEnableBlueskyMutationForUser('index');
    const disableBlueskyMutation = useDisableBlueskyMutationForUser('index');
    const enabled = account?.blueskyEnabled ?? false;

    const handleCopy = async () => {
        setCopied(true);
        await navigator.clipboard.writeText(account?.blueskyHandle || '');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleEnable = async () => {
        if (!account?.avatarUrl) {
            setIsEditingProfile(true);
        } else {
            setLoading(true);
            try {
                await enableBlueskyMutation.mutateAsync();
                toast.success('Bluesky sharing enabled');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDisable = async () => {
        setLoading(true);
        try {
            await disableBlueskyMutation.mutateAsync();
            setShowConfirm(false);
            toast.success('Bluesky sharing disabled');
        } finally {
            setLoading(false);
        }
    };

    if (isLoadingAccount) {
        return (
            <Layout>
                <div className='mx-auto max-w-[620px] py-[min(4vh,48px)]'>
                    <div className='flex items-center justify-between gap-8'>
                        <H2>Bluesky sharing</H2>
                    </div>
                    <div className='mt-6 flex justify-center'>
                        <LoadingIndicator size='md' />
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className='mx-auto max-w-[620px] py-[min(4vh,48px)]'>
                <div className='flex items-center justify-between gap-8'>
                    <H2>Bluesky sharing</H2>
                    {enabled && <Button className='group w-24 translate-y-1 px-2 hover:!bg-red/5 hover:text-red' size='default' variant='outline' onClick={() => setShowConfirm(true)}>
                        <span className='size-2 rounded-full bg-green group-hover:hidden'></span>
                        <span className='group-hover:hidden'>Enabled</span>
                        <span className='hidden group-hover:!visible group-hover:!inline'>Disable</span>
                    </Button>}
                </div>
                {!enabled ?
                    <div className='mt-3 flex flex-col gap-5'>
                        <p className='text-base'>{!account?.avatarUrl ?
                            'Add a profile image to connect to Bluesky. Profile pictures help prevent spam.' :
                            'Connect your account to Bluesky to share your content directly to your Bluesky profile. When enabled, new posts you create can be automatically shared to your Bluesky account, expanding your reach across platforms.'
                        }</p>
                        <p className='-mt-2 text-base'>Username changes aren&apos;t supported. Make sure you&apos;re happy with your social web handle before connecting.</p>
                        {!account?.avatarUrl ? (
                            <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                                <DialogTrigger>
                                    <Button className='h-10 w-full text-base' variant='secondary'>Edit profile</Button>
                                </DialogTrigger>
                                <DialogContent className='w-full max-w-[520px]' onOpenAutoFocus={e => e.preventDefault()}>
                                    <DialogHeader>
                                        <DialogTitle>Profile settings</DialogTitle>
                                    </DialogHeader>
                                    {account && <EditProfile account={account} setIsEditingProfile={setIsEditingProfile} />}
                                </DialogContent>
                            </Dialog>
                        ) : (
                            <Button className='h-10 text-base' disabled={loading} variant='secondary' onClick={handleEnable}>
                                {!loading ?
                                    <><svg height="32" role="img" viewBox="0 0 24 24" width="32" xmlns="http://www.w3.org/2000/svg"><path d="M12 10.8c-1.087 -2.114 -4.046 -6.053 -6.798 -7.995C2.566 0.944 1.561 1.266 0.902 1.565 0.139 1.908 0 3.08 0 3.768c0 0.69 0.378 5.65 0.624 6.479 0.815 2.736 3.713 3.66 6.383 3.364 0.136 -0.02 0.275 -0.039 0.415 -0.056 -0.138 0.022 -0.276 0.04 -0.415 0.056 -3.912 0.58 -7.387 2.005 -2.83 7.078 5.013 5.19 6.87 -1.113 7.823 -4.308 0.953 3.195 2.05 9.271 7.733 4.308 4.267 -4.308 1.172 -6.498 -2.74 -7.078a8.741 8.741 0 0 1 -0.415 -0.056c0.14 0.017 0.279 0.036 0.415 0.056 2.67 0.297 5.568 -0.628 6.383 -3.364 0.246 -0.828 0.624 -5.79 0.624 -6.478 0 -0.69 -0.139 -1.861 -0.902 -2.206 -0.659 -0.298 -1.664 -0.62 -4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z" fill="#0385FF" strokeWidth="1"></path></svg>
                                        Enable Bluesky sharing</> :
                                    <LoadingIndicator size='sm' />
                                }
                            </Button>
                        )}
                    </div> :
                    <>
                        <p className='mt-2 pr-32 text-base'>Your social web profile is now connected to Bluesky, via <a className="text-purple hover:text-purple-600" href="https://fed.brid.gy" rel="noreferrer" target="_blank">Bridgy Fed</a>. Posts are automatically synced after a short delay to complete activation.</p>
                        <div className='mt-6 flex flex-col items-center gap-4 rounded-lg border border-gray-200 p-8 dark:border-gray-950'>
                            <div className='relative'>
                                <APAvatar
                                    author={
                                        {
                                            icon: {
                                                url: account?.avatarUrl || ''
                                            },
                                            name: account?.name || '',
                                            handle: account?.handle || ''
                                        }
                                    }
                                    size='md'
                                />
                                <div className='absolute bottom-0 right-0 z-10 flex size-6 items-center justify-center rounded-full bg-white shadow-xs'>
                                    <svg height="14" role="img" viewBox="0 0 24 24" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M12 10.8c-1.087 -2.114 -4.046 -6.053 -6.798 -7.995C2.566 0.944 1.561 1.266 0.902 1.565 0.139 1.908 0 3.08 0 3.768c0 0.69 0.378 5.65 0.624 6.479 0.815 2.736 3.713 3.66 6.383 3.364 0.136 -0.02 0.275 -0.039 0.415 -0.056 -0.138 0.022 -0.276 0.04 -0.415 0.056 -3.912 0.58 -7.387 2.005 -2.83 7.078 5.013 5.19 6.87 -1.113 7.823 -4.308 0.953 3.195 2.05 9.271 7.733 4.308 4.267 -4.308 1.172 -6.498 -2.74 -7.078a8.741 8.741 0 0 1 -0.415 -0.056c0.14 0.017 0.279 0.036 0.415 0.056 2.67 0.297 5.568 -0.628 6.383 -3.364 0.246 -0.828 0.624 -5.79 0.624 -6.478 0 -0.69 -0.139 -1.861 -0.902 -2.206 -0.659 -0.298 -1.664 -0.62 -4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z" fill="#0385FF" strokeWidth="1"></path></svg>
                                </div>
                            </div>
                            <div className='flex grow flex-col items-center'>
                                <H3>{account?.name || ''}</H3>
                                <div className='flex items-center gap-1 text-gray-800'>
                                    <span className='text-lg font-medium'>{account?.blueskyHandle}</span>
                                    <Button className='size-6 p-0 hover:opacity-80' title='Copy handle' variant='link' onClick={handleCopy}>
                                        {!copied ?
                                            <LucideIcon.Copy size={16} /> :
                                            <LucideIcon.Check size={16} />
                                        }
                                    </Button>
                                </div>
                            </div>
                            <Button className='mt-2 w-full' size='lg' variant='secondary' asChild>
                                <a href={`https://bsky.app/profile/${account?.blueskyHandle?.replace(/^@/, '')}`} rel='noreferrer' target='_blank'>
                                        Open profile
                                    <LucideIcon.ExternalLink size={14} strokeWidth={1.25} />
                                </a>
                            </Button>
                        </div>
                    </>
                }
            </div>

            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Disable Bluesky sharing?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Your bridged Bluesky account will be deactivated and your content will no longer be shared on Bluesky. You can re-enable sharing at any time.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className={buttonVariants({variant: 'destructive'})}
                            disabled={loading}
                            onClick={(e) => {
                                e.preventDefault();
                                handleDisable();
                            }}
                        >
                            {loading ? <LoadingIndicator color='light' size='sm' /> : 'Disable'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Layout>
    );
};

export default BlueskySharing;
