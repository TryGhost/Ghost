import * as React from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@tryghost/shade';

interface FeedbackProps extends React.ComponentProps<typeof Card> {};

const Feedback: React.FC<FeedbackProps> = (props) => {
    return (
        <Card {...props}>
            <CardHeader>
                <CardTitle>Feedback</CardTitle>
                <CardDescription>
                    188 reactions
                </CardDescription>
            </CardHeader>
            <CardContent>
                Card contents
            </CardContent>
        </Card>
    );
};

export default Feedback;
