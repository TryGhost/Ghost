import Header from '../../components/Header';
import {ANALYTICS} from '../../routes';
import {LucideIcon, Page, Tabs, TabsList, TabsTrigger} from '@tryghost/shade';
import {Outlet, useLocation, useNavigate, useParams} from 'react-router';

interface postAnalyticsProps {};

const PostAnalytics: React.FC<postAnalyticsProps> = () => {
    const navigate = useNavigate();
    const {postId} = useParams();
    const location = useLocation();
    const currentTab = location.pathname.split('/').pop() || 'overview';

    const handleTabChange = (value: string) => {
        if (value === 'overview') {
            navigate(`${ANALYTICS}/${postId}`);
        } else {
            navigate(`${ANALYTICS}/${postId}/${value}`);
        }
    };

    return (
        <Page>
            <Header />
            <Tabs
                className='my-8 flex grow flex-col'
                value={currentTab}
                variant="button"
                onValueChange={handleTabChange}
            >
                <TabsList className='w-full'>
                    <TabsTrigger value="overview"><LucideIcon.Gauge /> Overview</TabsTrigger>
                    <TabsTrigger value="newsletter"><LucideIcon.Mail /> Newsletter</TabsTrigger>
                </TabsList>
                <div>
                    <Outlet />
                </div>
            </Tabs>
        </Page>
    );
};

export default PostAnalytics;
