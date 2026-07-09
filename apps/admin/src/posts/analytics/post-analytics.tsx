import PostAnalyticsLayout from './components/layout/post-analytics-layout';
import {Outlet, trackEvent} from '@tryghost/admin-x-framework';
import {PostShareModal} from '@tryghost/shade/posts-stats';
import {useEffect} from 'react';
import {usePostSuccessModal} from '@/posts/analytics/hooks/use-post-success-modal';

const PostAnalytics: React.FC = () => {
    const {isModalOpen, modalProps} = usePostSuccessModal();

    // The publish-success share modal is only rendered once both the open flag
    // and the post-backed props are ready. It never offers gift links today.
    const isShareModalShown = isModalOpen && !!modalProps;
    useEffect(() => {
        if (isShareModalShown) {
            trackEvent('Share Modal Opened', {giftLinkShown: false, source: 'publish-flow'});
        }
    }, [isShareModalShown]);

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
