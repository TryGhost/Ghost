import {Button, H1, Page} from '@tryghost/shade';
import {useNavigate} from '@tryghost/admin-x-framework';

interface postAnalyticsProps {};

const Posts: React.FC<postAnalyticsProps> = () => {
    const navigate = useNavigate();

    return (
        <Page>
            <H1 className='my-8 min-h-[38px]'>Posts</H1>
            <div className='flex items-center gap-2'>
                <Button onClick={() => navigate('analytics/123')}>Analytics</Button>
                <Button variant='secondary' onClick={() => navigate('analytics/123/share')}>Open dialog via navigation</Button>
                <Button variant='secondary' onClick={() => navigate('dashboard', {crossApp: true})}>Go to dashboard (external route)</Button>
            </div>
        </Page>
    );
};

export default Posts;
