import React from 'react';
import moment from 'moment-timezone';
import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, H1, LucideIcon, Navbar, NavbarActions, Tabs, TabsList, TabsTrigger, ViewHeader} from '@tryghost/shade';
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
            fields: 'title,slug,published_at,uuid,feature_image'
        }
    });

    const typedPost = post as PostWithPublishedAt;

    return (
        <>
            <ViewHeader className='w-full items-start !pb-0 before:hidden'>
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
                            <Button variant='outline'><LucideIcon.Ellipsis /></Button>
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
                                    {post && post.title}
                                </H1>
                                {typedPost && typedPost.published_at && (
                                    <div className='mt-0.5 flex items-center justify-start text-sm leading-[1.65em] text-muted-foreground'>
                            Published on your site on {moment.utc(typedPost.published_at).format('D MMM YYYY')} at {moment.utc(typedPost.published_at).format('HH:mm')}
                                    </div>
                                )}
                            </div>
                        </div>
                    }
                    <Navbar className='-mt-1'>
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
                </div>
            </ViewHeader>
        </>
    );
};

export default PostAnalyticsHeader;