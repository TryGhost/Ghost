import React from 'react';
import moment from 'moment-timezone';
import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger, H1, LucideIcon, Navbar, NavbarActions, Tabs, TabsList, TabsTrigger} from '@tryghost/shade';
import {Post, useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';

interface PostWithPublishedAt extends Post {
    published_at?: string;
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
            fields: 'title,slug,published_at,uuid,feature_image,url'
        }
    });

    const typedPost = post as PostWithPublishedAt;

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
                            {post.feature_image &&
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
            <Navbar className='sticky top-0 z-50 bg-white/70 pt-6 backdrop-blur-md dark:bg-black'>
                <Tabs className="w-full" defaultValue={currentTab} variant='navbar'>
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
                        <TabsTrigger value="Newsletter" onClick={() => {
                            navigate(`/analytics/beta/${postId}/newsletter`);
                        }}>
            Newsletter
                        </TabsTrigger>
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