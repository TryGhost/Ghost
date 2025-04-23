import PostAnalyticsLayout from './layout/PostAnalyticsLayout';
import PostAnalyticsView from './components/PostAnalyticsView';
import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, H1, ViewHeader} from '@tryghost/shade';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';

interface postAnalyticsProps {};

const PostAnalytics: React.FC<postAnalyticsProps> = () => {
    const {postId} = useParams();
    const navigate = useNavigate();

    return (
        <PostAnalyticsLayout>
            <ViewHeader className='pb-4'>
                <div className='flex w-full max-w-[700px] grow flex-col'>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink className='cursor-pointer' onClick={() => navigate('/posts/', {crossApp: true})}>
                                Posts
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbLink className='cursor-pointer' onClick={() => navigate(`/posts/analytics/${postId}`, {crossApp: true})}>
                                Analytics
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>
                                Web
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <H1 className='mt-0.5 min-h-[35px] indent-0'>Post title</H1>
                    <div className='-mt-0.5 flex h-9 items-center text-sm text-gray-700'>
                        Published date
                    </div>
                </div>
            </ViewHeader>
            <PostAnalyticsView data={[1]} isLoading={false}>
                Hello post analytics ({postId})
            </PostAnalyticsView>
        </PostAnalyticsLayout>
    );
};

export default PostAnalytics;
