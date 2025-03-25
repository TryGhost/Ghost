import React from 'react';
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from '@tryghost/shade';

const Locations:React.FC = () => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Locations</CardTitle>
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

export default Locations;