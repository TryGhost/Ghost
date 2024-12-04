'use client';

import NewsletterPerformance from './NewsletterPerformance';
import Feedback from './FeedBack';
import ClickPerformance from './ClickPerformance';
import Conversions from './Conversions';

const OverviewStats = () => {
    return (
        <div className="grid w-full grid-cols-3 gap-6 py-6">
            <NewsletterPerformance />
            <Feedback />
            <ClickPerformance />
            <Conversions />
        </div>
    );
};

export default OverviewStats;