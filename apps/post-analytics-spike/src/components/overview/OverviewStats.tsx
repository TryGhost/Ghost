// The main Web stats component that encapsulates the breakdown
'use client';

import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@tryghost/shade';
import NewsletterPerformance from './NewsletterPerformance';
import Feedback from './FeedBack';
import ClickPerformance from './ClickPerformance';

const OverviewStats = () => {
    return (
        <div className="grid w-full grid-cols-3 gap-6 py-6">
            <NewsletterPerformance />
            <Feedback />
            <ClickPerformance />

            <Card>
                <CardHeader>
                    <CardTitle>Conversion</CardTitle>
                    <CardDescription>3 members signed up on this post</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className='py-5'>

                    </div>
                </CardContent>
                <CardFooter>
                    <Button className='h-auto p-0' variant='link'>Details &rarr;</Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default OverviewStats;