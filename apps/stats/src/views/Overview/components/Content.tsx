import React from 'react';
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from '@tryghost/shade';

const Content:React.FC = () => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent>
                Chart
            </CardContent>
            <CardFooter>
                See all &rarr;
            </CardFooter>
        </Card>
    );
};

export default Content;