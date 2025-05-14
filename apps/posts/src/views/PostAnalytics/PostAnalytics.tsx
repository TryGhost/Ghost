import PostAnalyticsLayout from './components/layout/PostAnalyticsLayout';
import {Outlet} from '@tryghost/admin-x-framework';

const PostAnalytics: React.FC = () => {
    return (
        <PostAnalyticsLayout>
            <Outlet />
        </PostAnalyticsLayout>
    );
};

export default PostAnalytics;
