import Header from '../../components/Header';
import {Outlet, useLocation, useNavigate, useParams} from '@tryghost/admin-x-framework';
import {Page, Tabs, TabsList, TabsTrigger} from '@tryghost/shade';

interface postAnalyticsProps {};

const PostAnalytics: React.FC<postAnalyticsProps> = () => {
    const navigate = useNavigate();
    const {postId} = useParams();
    const location = useLocation();

    let currentTab = location.pathname.split('/').pop();
    if (currentTab === postId || !currentTab) {
        currentTab = 'overview';
    }

    const handleTabChange = (value: string) => {
        if (value === 'overview') {
            navigate(`analytics/${postId}`);
        } else {
            navigate(`analytics/${postId}/${value}`);
        }
    };

    return (
        <Page>
            <Header />
            <Tabs
                className='my-8 flex grow flex-col'
                value={currentTab}
                variant="underline"
                onValueChange={handleTabChange}
            >
                <TabsList className='w-full'>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
                </TabsList>
                <div>
                    <Outlet />
                </div>
            </Tabs>
        </Page>
    );
};

export default PostAnalytics;
