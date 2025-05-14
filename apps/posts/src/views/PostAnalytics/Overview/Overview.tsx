import AudienceSelect from '../components/AudienceSelect';
import DateRangeSelect from '../components/DateRangeSelect';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import {ViewHeader, ViewHeaderActions} from '@tryghost/shade';

interface postAnalyticsProps {
    children?: React.ReactNode;
}

const Overview: React.FC<postAnalyticsProps> = ({children}) => {
    return (
        <>
            <ViewHeader className='items-end pb-4'>
                <PostAnalyticsHeader currentTab='Overview' />
                <ViewHeaderActions className='mb-2'>
                    <AudienceSelect />
                    <DateRangeSelect />
                </ViewHeaderActions>
            </ViewHeader>
            <PostAnalyticsContent>
                {children || <div>Hey analytics overview</div>}
            </PostAnalyticsContent>
        </>
    );
};

export default Overview;
