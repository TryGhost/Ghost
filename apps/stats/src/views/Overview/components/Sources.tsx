import React from 'react';
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from '@tryghost/shade';

const Sources:React.FC = () => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Sources</CardTitle>
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

export default Sources;