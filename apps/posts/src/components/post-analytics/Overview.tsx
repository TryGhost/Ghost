import ClickPerformance from './overview/ClickPerformance';
import Conversions from './overview/Conversions';
import Feedback from './overview/Feedback';
import NewsletterPerformance from './overview/NewsletterPerformance';

const Overview = () => {
    return (
        <div className="grid w-full grid-cols-3 gap-6 py-4">
            <NewsletterPerformance className='col-span-2' />
            <Feedback />
            <ClickPerformance className='col-span-2' />
            <Conversions />
        </div>
    );
};

export default Overview;
