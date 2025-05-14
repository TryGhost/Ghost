import DateRangeSelect from '../components/DateRangeSelect';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';

const Overview: React.FC = () => {
    return (
        <>
            <PostAnalyticsHeader currentTab='Overview'>
                <DateRangeSelect />
            </PostAnalyticsHeader>
            <PostAnalyticsContent>
                <div>Analytics overview</div>
            </PostAnalyticsContent>
        </>
    );
};

export default Overview;
