import PostAnalyticsLayout from './layout/PostAnalyticsLayout';
import PostAnalyticsView from './components/PostAnalyticsView';
import {ViewHeader, ViewHeaderActions} from '@tryghost/shade';

interface postAnalyticsProps {};

const PostAnalytics: React.FC<postAnalyticsProps> = () => {
    return (
        <PostAnalyticsLayout>
            <ViewHeader>
                Post analytics
                <ViewHeaderActions>Actions</ViewHeaderActions>
            </ViewHeader>
            <PostAnalyticsView>
                Hello post analytics
            </PostAnalyticsView>
        </PostAnalyticsLayout>
    );
};

export default PostAnalytics;
