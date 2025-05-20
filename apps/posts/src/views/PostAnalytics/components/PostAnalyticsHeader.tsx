import React from 'react';
import moment from 'moment-timezone';
import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger, H1, LucideIcon, Navbar, NavbarActions, Tabs, TabsList, TabsTrigger} from '@tryghost/shade';
import {Post, useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {hasBeenEmailed, useNavigate, useParams} from '@tryghost/admin-x-framework';

interface PostWithPublishedAt extends Post {
    published_at?: string;
}

// Extended Email type to include status field
interface ExtendedEmail {
    opened_count: number;
    email_count: number;
    status?: string;
}

// Extended Post type with the ExtendedEmail and additional fields
interface PostWithEmail extends PostWithPublishedAt {
    email?: ExtendedEmail;
    newsletter_id?: string;
    newsletter?: object;
    status?: string;
    email_only?: boolean;
    email_segment?: string;
    email_recipient_filter?: string;
    send_email_when_published?: boolean;
    email_stats?: object;
}

interface PostAnalyticsHeaderProps {
    currentTab?: string;
    children?: React.ReactNode;
}

const PostAnalyticsHeader:React.FC<PostAnalyticsHeaderProps> = ({
    currentTab,
    children
}) => {
    const {postId} = useParams();
    const navigate = useNavigate();

    const {data: {posts: [post]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            fields: 'title,slug,published_at,uuid,feature_image,url,email,status',
            include: 'email'
        }
    });

    const typedPost = post as PostWithEmail;
    // Use the utility function from admin-x-framework
    const showNewsletterTab = hasBeenEmailed(typedPost as Post);

    return (
        <>
            <header className='z-50 -mx-8 bg-white/70 backdrop-blur-md dark:bg-black'>
                <div className='relative flex min-h-[102px] w-full items-start justify-between gap-5 p-8 pb-0'>
                    <div className='flex w-full flex-col gap-5'>
                        <div className='flex w-full items-center justify-between'>
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink className='cursor-pointer leading-[24px]' onClick={() => navigate('/posts/', {crossApp: true})}>
                                    Posts
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage className='leading-[24px]'>
                                        Analytics
                                        </BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                            <div className='flex items-center gap-2'>
                                {/* <Button variant='outline'><LucideIcon.RefreshCw /></Button> */}
                                {/* <Button variant='outline'><LucideIcon.Share /></Button> */}
                                {!isPostLoading &&
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant='outline'><LucideIcon.Ellipsis /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align='end'>
                                        <DropdownMenuGroup>
                                            <DropdownMenuItem asChild>
                                                <a href={post.url} rel="noopener noreferrer" target="_blank">View in browser</a>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => {
                                                navigate(`/editor/post/${postId}`, {crossApp: true});
                                            }}>
                                                Edit post
                                                {/* <DropdownMenuShortcut>⌘E</DropdownMenuShortcut> */}
                                            </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                }
                            </div>
                        </div>
                        {!isPostLoading &&
                        <div className='flex items-center gap-6'>
                            {post?.feature_image &&
                                <div className='h-[82px] w-[132px] rounded-md bg-cover' style={{
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
                            Web stats
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
        </>
    );
};

export default PostAnalyticsHeader;