import React, {useMemo, useState} from 'react';
import moment from 'moment-timezone';
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, H1, LucideIcon, Navbar, NavbarActions, PageMenu, PageMenuItem, PostShareModal, formatNumber} from '@tryghost/shade';
import {Post, useGlobalData} from '@src/providers/PostAnalyticsContext';
import {hasBeenEmailed, isEmailOnly, isPublishedAndEmailed, isPublishedOnly, useActiveVisitors, useNavigate} from '@tryghost/admin-x-framework';
import {useAppContext} from '../../../App';
import {useDeletePost} from '@tryghost/admin-x-framework/api/posts';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

interface PostAnalyticsHeaderProps {
    currentTab?: string;
    children?: React.ReactNode;
}

const PostAnalyticsHeader:React.FC<PostAnalyticsHeaderProps> = ({
    currentTab,
    children
}) => {
    const navigate = useNavigate();
    const {fromAnalytics, appSettings} = useAppContext();
    const {mutateAsync: deletePost} = useDeletePost();
    const handleError = useHandleError();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const {site, statsConfig, post, isPostLoading, postId} = useGlobalData();

    // Use the active visitors hook with post-specific filtering
    const {activeVisitors, isLoading: isActiveVisitorsLoading} = useActiveVisitors({
        postUuid: post?.uuid,
        statsConfig,
        enabled: appSettings?.analytics?.webAnalytics ?? false
    });
    
    // Determine which tabs to show based on post type and settings
    const availableTabs = useMemo(() => {
        if (!post) {
            return [];
        }
        const tabs = [];
        
        // Only show Overview and Web tabs if it's NOT a published-only post with web analytics disabled
        const isPublishedOnlyWithoutWebAnalytics = isPublishedOnly(post as Post) && !appSettings?.analytics.webAnalytics;
        if (!isPublishedOnlyWithoutWebAnalytics) {
            tabs.push('Overview');   
            if (!post.email_only && appSettings?.analytics.webAnalytics) {
                tabs.push('Web');
            }
        }
        if (hasBeenEmailed(post as Post)) {
            tabs.push('Newsletter');
        }
        tabs.push('Growth');
        
        return tabs;
    }, [post, appSettings?.analytics.webAnalytics]);

    const handleDeletePost = () => {
        if (!post) {
            return;
        }

        // We'll implement this as a controlled AlertDialog with React state
        setShowDeleteDialog(true);
    };

    const performDelete = async () => {
        if (!post) {
            return;
        }
        try {
            await deletePost(postId);
            setShowDeleteDialog(false);
            // Navigate back to posts list
            navigate('/posts/', {crossApp: true});
        } catch (e) {
            handleError(e);
        }
    };

    return (
        <>
            <header className='z-50 -mx-8 bg-white/70 backdrop-blur-md dark:bg-black'>
                <div className='relative flex min-h-[102px] w-full items-start justify-between gap-5 px-8 pb-0 pt-8'>
                    <div className='flex w-full flex-col gap-5'>
                        <div className='flex w-full flex-col justify-between md:flex-row md:items-center'>
                            <Breadcrumb>
                                <BreadcrumbList>
                                    {fromAnalytics
                                        ?
                                        <BreadcrumbItem>
                                            <BreadcrumbLink className='cursor-pointer leading-[24px]' onClick={() => navigate('/analytics/', {crossApp: true})}>Analytics</BreadcrumbLink>
                                        </BreadcrumbItem>
                                        :
                                        <BreadcrumbItem>
                                            <BreadcrumbLink className='cursor-pointer leading-[24px]' onClick={() => navigate('/posts/', {crossApp: true})}>Posts</BreadcrumbLink>
                                        </BreadcrumbItem>
                                    }
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage className='leading-[24px]'>
                                        Post analytics
                                        </BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                            <div className='flex w-full items-center gap-2 md:w-auto'>
                                {appSettings?.analytics.webAnalytics && !post?.email_only && (
                                    <div className='mr-3 flex grow items-center gap-2 text-sm md:grow-0'>
                                        <div className='flex items-center gap-2 text-sm text-muted-foreground' title='Active readers in the last 5 minutes · Updates every 60 seconds'>
                                            <span className='text-sm'>
                                                {isActiveVisitorsLoading ? '' : formatNumber(activeVisitors)} reading now
                                            </span>
                                            <div className={`size-2 rounded-full ${isActiveVisitorsLoading ? 'animate-pulse bg-muted' : activeVisitors ? 'bg-green-500' : 'border border-muted-foreground'}`}></div>
                                        </div>
                                    </div>
                                )}
                                {/* <Button variant='outline'><LucideIcon.RefreshCw /></Button> */}
                                {/* <Button variant='outline'><LucideIcon.Share /></Button> */}
                                {!isPostLoading &&
                                <>
                                    {!post?.email_only && (
                                        <PostShareModal
                                            author={post?.authors?.[0]?.name || ''}
                                            description=''
                                            faviconURL={site?.icon || ''}
                                            featureImageURL={post?.feature_image}
                                            open={isShareOpen}
                                            postExcerpt={post?.excerpt || ''}
                                            postTitle={post?.title}
                                            postURL={post?.url}
                                            siteTitle={site?.title || ''}
                                            onClose={() => setIsShareOpen(false)}
                                            onOpenChange={setIsShareOpen}
                                        >
                                            <Button variant='outline' onClick={() => setIsShareOpen(true)}><LucideIcon.Share /> Share</Button>
                                        </PostShareModal>
                                    )}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant='outline'><LucideIcon.Ellipsis /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align='end'>
                                            <DropdownMenuGroup>
                                                <DropdownMenuItem asChild>
                                                    <a href={post?.url} rel="noopener noreferrer" target="_blank">
                                                        <LucideIcon.ExternalLink />
                                                    View in browser
                                                    </a>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => {
                                                    navigate(`/editor/post/${postId}`, {crossApp: true});
                                                }}>
                                                    <LucideIcon.Pen />
                                                Edit post
                                                    {/* <DropdownMenuShortcut>⌘E</DropdownMenuShortcut> */}
                                                </DropdownMenuItem>
                                            </DropdownMenuGroup>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuGroup>
                                                <DropdownMenuItem
                                                    className='text-destructive focus:text-destructive'
                                                    onClick={handleDeletePost}
                                                >
                                                    <LucideIcon.Trash />
                                                Delete post
                                                </DropdownMenuItem>
                                            </DropdownMenuGroup>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </>
                                }
                            </div>
                        </div>
                        {!isPostLoading &&
                        <div className='flex items-start gap-6 md:items-center'>
                            {post?.feature_image &&
                                <div className='aspect-[16/10] w-full max-w-[100px] rounded-md bg-cover bg-center md:max-w-[132px]' style={{
                                    backgroundImage: `url(${post.feature_image})`
                                }}></div>
                            }
                            <div>
                                <H1 className='-ml-px max-w-[920px] indent-0 text-xl md:min-h-[35px] md:text-3xl md:leading-[1.2em]'>
                                    {post?.title}
                                </H1>
                                {post?.published_at && (
                                    <div className='mt-0.5 flex items-center justify-start text-sm leading-[1.65em] text-muted-foreground'>
                                        {isEmailOnly(post as Post) && `Sent on ${moment(post.published_at).format('D MMM YYYY')} at ${moment(post.published_at).format('HH:mm')}`}
                                        {isPublishedOnly(post as Post) && `Published on your site on ${moment(post.published_at).format('D MMM YYYY')} at ${moment(post.published_at).format('HH:mm')}`}
                                        {isPublishedAndEmailed(post as Post) && `Published and sent on ${moment(post.published_at).format('D MMM YYYY')} at ${moment(post.published_at).format('HH:mm')}`}
                                    </div>
                                )}
                            </div>
                        </div>
                        }
                    </div>
                </div>
            </header>
            <Navbar className='sticky top-0 z-50 -mb-8 flex-col items-start gap-y-5 border-none bg-white/70 py-8 backdrop-blur-md lg:flex-row lg:items-center dark:bg-black'>
                {!isPostLoading && (
                    <PageMenu className='min-h-[34px]' defaultValue={currentTab} responsive>
                        {availableTabs.includes('Overview') && (
                            <PageMenuItem value="Overview" onClick={() => {
                                navigate(`/analytics/${postId}`);
                            }}>
                                    Overview
                            </PageMenuItem>
                        )}
                        {availableTabs.includes('Web') && (
                            <PageMenuItem value="Web" onClick={() => {
                                navigate(`/analytics/${postId}/web`);
                            }}>
                                    Web traffic
                            </PageMenuItem>
                        )}
                        {availableTabs.includes('Newsletter') && (
                            <PageMenuItem value="Newsletter" onClick={() => {
                                navigate(`/analytics/${postId}/newsletter`);
                            }}>
                                    Newsletter
                            </PageMenuItem>
                        )}
                        {availableTabs.includes('Growth') && (
                            <PageMenuItem value="Growth" onClick={() => {
                                navigate(`/analytics/${postId}/growth`);
                            }}>
                                    Growth
                            </PageMenuItem>
                        )}
                    </PageMenu>
                )}
                {children &&
                    <NavbarActions>
                        {children}
                    </NavbarActions>
                }
            </Navbar>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Are you sure you want to delete this post?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            You&apos;re about to delete &quot;<strong>{post?.title}</strong>&quot;.
                            This is permanent! We warned you, k?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="hover:bg-red-700 bg-red-600 text-white"
                            onClick={performDelete}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default PostAnalyticsHeader;
