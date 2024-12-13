import Header from '../components/layout/Header';
import Overview from '../components/post-analytics/Overview';
import {Page} from '@tryghost/shade';

const PostAnalytics = () => {
    return (
        <Page>
            <Header />
            <div>[TK: tabs]</div>

            <Overview />
        </Page>
    );
};

export default PostAnalytics;