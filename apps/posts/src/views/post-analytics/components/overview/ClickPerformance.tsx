import * as React from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@tryghost/shade';

interface ClickPerformanceProps extends React.ComponentProps<typeof Card> {};

const ClickPerformance: React.FC<ClickPerformanceProps> = (props) => {
    return (
        <Card {...props}>
            <CardHeader>
                <CardTitle>Click performance</CardTitle>
                <CardDescription>
                    Links in this newsletter
                </CardDescription>
            </CardHeader>
            <CardContent>
                Card contents
            </CardContent>
        </Card>
    );
};

export default ClickPerformance;
