import * as React from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@tryghost/shade';

interface NewsletterPerformanceProps extends React.ComponentProps<typeof Card> {};

const NewsletterPerformance: React.FC<NewsletterPerformanceProps> = (props) => {
    return (
        <Card {...props}>
            <CardHeader>
                <CardTitle>Newsletter performance</CardTitle>
                <CardDescription>
                    Sent 19 Sept 2024
                </CardDescription>
            </CardHeader>
            <CardContent>
                Card contents
            </CardContent>
        </Card>
    );
};

export default NewsletterPerformance;
