import PostAnalyticsLayout from './components/layout/PostAnalyticsLayout';
import {Outlet} from '@tryghost/admin-x-framework';
import {STATS_RANGES} from '@src/utils/constants';
import {useEffect} from 'react';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';

const PostAnalytics: React.FC = () => {
    const {setRange} = useGlobalData();

    useEffect(() => {
        setRange(STATS_RANGES.ALL_TIME.value);
    }, [setRange]);

    return (
        <PostAnalyticsLayout>
            <Outlet />
        </PostAnalyticsLayout>
    );
};

export default PostAnalytics;
