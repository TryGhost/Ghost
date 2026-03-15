import PostAnalyticsLayout from './components/layout/post-analytics-layout';
import {Outlet} from '@tryghost/admin-x-framework';
import {PostShareModal} from '@tryghost/shade';
import {usePostSuccessModal} from '@hooks/use-post-success-modal';

const PostAnalytics: React.FC = () => {
    const {isModalOpen, modalProps} = usePostSuccessModal();

    return (
        <PostAnalyticsLayout>
            <Outlet />
            {isModalOpen && modalProps && (
                <PostShareModal {...modalProps} />
            )}
        </PostAnalyticsLayout>
    );
};

export default PostAnalytics;
