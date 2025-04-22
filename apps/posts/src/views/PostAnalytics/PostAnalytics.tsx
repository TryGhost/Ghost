import PostAnalyticsLayout from './layout/PostAnalyticsLayout';
import PostAnalyticsView from './components/PostAnalyticsView';
import {ViewHeader} from '@tryghost/shade';
import {useParams} from '@tryghost/admin-x-framework';

interface postAnalyticsProps {};

const PostAnalytics: React.FC<postAnalyticsProps> = () => {
    const {postId} = useParams();

    return (
        <PostAnalyticsLayout>
            <ViewHeader>
                Post analytics
            </ViewHeader>
            <PostAnalyticsView data={[1]} isLoading={false}>
                Hello post analytics ({postId})
            </PostAnalyticsView>
        </PostAnalyticsLayout>
    );
};

export default PostAnalytics;
