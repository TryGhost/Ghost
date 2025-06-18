import PostAnalyticsLayout from './components/layout/PostAnalyticsLayout';
import {Outlet} from '@tryghost/admin-x-framework';
import {PostShareModal} from '@tryghost/shade';
import {usePostSuccessModal} from '@src/hooks/usePostSuccessModal';

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
