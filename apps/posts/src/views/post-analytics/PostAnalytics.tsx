import Header from '../../components/Header';
import Newsletter from './components/Newsletter';
import Overview from './components/Overview';
import {LucideIcon, Page, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade';

interface postAnalyticsProps {};

const PostAnalytics: React.FC<postAnalyticsProps> = () => {
    return (
        <Page>
            <Header />
            <Tabs className='my-8 flex grow flex-col' defaultValue="overview" variant="button">
                <TabsList className='w-full'>
                    <TabsTrigger value="overview"><LucideIcon.Gauge /> Overview</TabsTrigger>
                    <TabsTrigger value="newsletter"><LucideIcon.Mail /> Newsletter</TabsTrigger>
                    <TabsTrigger value="web"><LucideIcon.Earth /> Web</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                    <Overview />
                </TabsContent>
                <TabsContent className='mt-0 flex grow flex-col' value="newsletter">
                    <Newsletter />
                </TabsContent>
            </Tabs>
        </Page>
    );
};

export default PostAnalytics;
