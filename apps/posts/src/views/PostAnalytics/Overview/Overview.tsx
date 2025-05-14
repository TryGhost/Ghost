import DateRangeSelect from '../components/DateRangeSelect';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import {Card, CardContent, CardHeader, CardTitle} from '@tryghost/shade';

const Overview: React.FC = () => {
    return (
        <>
            <PostAnalyticsHeader currentTab='Overview'>
                <DateRangeSelect />
            </PostAnalyticsHeader>
            <PostAnalyticsContent>
                <Card>
                    <CardHeader>
                        <CardTitle>Newsletter performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        Charts...
                    </CardContent>
                </Card>
                <div className='grid grid-cols-2 gap-8'>
                    <Card>
                        <CardHeader>
                            <CardTitle>Link clicks</CardTitle>
                        </CardHeader>
                        <CardContent>
                            Table...
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Feedback</CardTitle>
                        </CardHeader>
                        <CardContent>
                            Chart
                        </CardContent>
                    </Card>
                </div>
                <div className='grid grid-cols-2 gap-8'>
                    <Card>
                        <CardHeader>
                            <CardTitle>Help box 1</CardTitle>
                        </CardHeader>
                        <CardContent>
                            Description...
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Help box 2</CardTitle>
                        </CardHeader>
                        <CardContent>
                            Description...
                        </CardContent>
                    </Card>
                </div>
            </PostAnalyticsContent>
        </>
    );
};

export default Overview;
