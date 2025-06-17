import PostAnalyticsLayout from './components/layout/PostAnalyticsLayout';
import PostSuccessModal from './modals/PostSuccessModal';
import {Outlet} from '@tryghost/admin-x-framework';
import {usePostSuccessModal} from '@src/hooks/usePostSuccessModal';

const PostAnalytics: React.FC = () => {
    const {isModalOpen, post, postCount, showPostCount, closeModal} = usePostSuccessModal();

    return (
        <PostAnalyticsLayout>
            <Outlet />
            {isModalOpen && post && (
                <PostSuccessModal
                    isOpen={isModalOpen}
                    post={post}
                    postCount={postCount || undefined}
                    showPostCount={showPostCount}
                    onClose={closeModal}
                />
            )}
        </PostAnalyticsLayout>
    );
};

export default PostAnalytics;
