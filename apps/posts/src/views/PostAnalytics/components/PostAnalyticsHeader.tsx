import React, {useState} from 'react';
import moment from 'moment-timezone';
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, H1, LucideIcon, Navbar, NavbarActions, PostShareModal, Tabs, TabsList, TabsTrigger} from '@tryghost/shade';
import {Post, useGlobalData} from '@src/providers/PostAnalyticsContext';
import {hasBeenEmailed, useNavigate} from '@tryghost/admin-x-framework';
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
    const {fromAnalytics} = useAppContext();
    const {mutateAsync: deletePost} = useDeletePost();
    const handleError = useHandleError();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const {site} = useGlobalData();

    // Use shared post data from context
    const {post, isPostLoading, postId} = useGlobalData();
    const typedPost = post as Post;
    // Use the utility function from admin-x-framework
    const showNewsletterTab = hasBeenEmailed(typedPost);

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
                        <div className='flex w-full items-center justify-between'>
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
                            <div className='flex items-center gap-2'>
                                {/* <Button variant='outline'><LucideIcon.RefreshCw /></Button> */}
                                {/* <Button variant='outline'><LucideIcon.Share /></Button> */}
                                {!isPostLoading &&
                                <>
                                    {!typedPost.email_only && (
                                        <PostShareModal
                                            author={typedPost.authors?.[0]?.name || ''}
                                            description=''
                                            faviconURL={site?.icon || ''}
                                            featureImageURL={typedPost.feature_image}
                                            open={isShareOpen}
                                            postExcerpt={typedPost.excerpt || ''}
                                            postTitle={typedPost.title}
                                            postURL={typedPost.url}
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
                        <div className='flex items-center gap-6'>
                            {post?.feature_image &&
                                <div className='h-[82px] w-[132px] rounded-md bg-cover bg-center' style={{
                                    backgroundImage: `url(${post.feature_image})`
                                }}></div>
                            }
                            <div>
                                <H1 className='-ml-px min-h-[35px] max-w-[920px] indent-0 leading-[1.2em]'>
                                    {post?.title}
                                </H1>
                                {typedPost && typedPost.published_at && (
                                    <div className='mt-0.5 flex items-center justify-start text-sm leading-[1.65em] text-muted-foreground'>
                            Published on your site on {moment.utc(typedPost.published_at).format('D MMM YYYY')} at {moment.utc(typedPost.published_at).format('HH:mm')}
                                    </div>
                                )}
                            </div>
                        </div>
                        }
                    </div>
                </div>
            </header>
            <Navbar className='sticky top-0 z-50 -mb-8 items-center border-none bg-white/70 py-8 backdrop-blur-md dark:bg-black'>
                <Tabs className="flex h-9 w-full items-center" defaultValue={currentTab} variant='pill'>
                    <TabsList>
                        <TabsTrigger value="Overview" onClick={() => {
                            navigate(`/analytics/beta/${postId}`);
                        }}>
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="Web" onClick={() => {
                            navigate(`/analytics/beta/${postId}/web`);
                        }}>
                            Web traffic
                        </TabsTrigger>
                        {showNewsletterTab && (
                            <TabsTrigger value="Newsletter" onClick={() => {
                                navigate(`/analytics/beta/${postId}/newsletter`);
                            }}>
                                Newsletter
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="Growth" onClick={() => {
                            navigate(`/analytics/beta/${postId}/growth`);
                        }}>
                            Growth
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                <NavbarActions>
                    {children}
                </NavbarActions>
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
