import React from 'react';
import moment from 'moment-timezone';
import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, H1} from '@tryghost/shade';
import {Post, useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';

interface PostWithPublishedAt extends Post {
    published_at?: string;
}

interface PostAnalyticsHeaderProps {
    currentTab?: string;
}

const PostAnalyticsHeader:React.FC<PostAnalyticsHeaderProps> = ({
    currentTab
}) => {
    const {postId} = useParams();
    const navigate = useNavigate();

    const {data: {posts: [post]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            fields: 'title,slug,published_at,uuid'
        }
    });

    const typedPost = post as PostWithPublishedAt;

    return (
        <div className='flex w-full max-w-[700px] grow flex-col'>
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink className='cursor-pointer leading-[24px]' onClick={() => navigate('/posts/', {crossApp: true})}>
                Posts
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink className='cursor-pointer leading-[24px]' onClick={() => navigate(`/posts/analytics/${postId}`, {crossApp: true})}>
                Analytics
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    {currentTab &&
                    <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage className='leading-[24px]'>
                                {currentTab}
                            </BreadcrumbPage>
                        </BreadcrumbItem>
                    </>
                    }
                </BreadcrumbList>
            </Breadcrumb>
            {!isPostLoading &&
            <>
                <H1 className='min-h-[35px] indent-0 leading-[1.2em]'>
                    {post && post.title}
                </H1>
                {typedPost && typedPost.published_at && (
                    <div className='flex h-9 items-center justify-start text-sm leading-[1.65em] text-grey-600'>
                Published on your site on {moment.utc(typedPost.published_at).format('D MMM YYYY')} at {moment.utc(typedPost.published_at).format('HH:mm')}
                    </div>
                )}
            </>
            }
        </div>
    );
};

export default PostAnalyticsHeader;