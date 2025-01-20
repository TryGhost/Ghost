import ClickPerformance from './overview/ClickPerformance';
import Conversions from './overview/Conversions';
import Feedback from './overview/Feedback';
import NewsletterPerformance from './overview/NewsletterPerformance';

interface overviewProps {};

const Overview: React.FC<overviewProps> = () => {
    return (
        <div className="grid w-full grid-cols-3 gap-5 py-5">
            <NewsletterPerformance className='col-span-2' />
            <Feedback />
            <ClickPerformance className='col-span-2' />
            <Conversions />
        </div>
    );
};

export default Overview;
