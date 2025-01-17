import * as React from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@tryghost/shade';

interface ConversionsProps extends React.ComponentProps<typeof Card> {};

const Conversions: React.FC<ConversionsProps> = (props) => {
    return (
        <Card {...props}>
            <CardHeader>
                <CardTitle>Conversions</CardTitle>
                <CardDescription>
                    3 members signed up on this post
                </CardDescription>
            </CardHeader>
            <CardContent>
                Card contents
            </CardContent>
        </Card>
    );
};

export default Conversions;
