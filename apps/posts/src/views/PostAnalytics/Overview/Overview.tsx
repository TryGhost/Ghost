import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';

const Overview: React.FC = () => {
    return (
        <>
            <PostAnalyticsHeader currentTab='Overview'>
                [View actions]
            </PostAnalyticsHeader>
            <PostAnalyticsContent>
                <div>Hey analytics overview</div>
            </PostAnalyticsContent>
        </>
    );
};

export default Overview;
