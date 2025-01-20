import * as React from 'react';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade';

interface ClickPerformanceProps extends React.ComponentProps<typeof Card> {};

const ClickPerformance: React.FC<ClickPerformanceProps> = (props) => {
    const mockData = [
        {
            url: 'activitypub.ghost.org/archive',
            clicks: '250'
        },
        {
            url: 'nytimes.com',
            clicks: '134'
        },
        {
            url: 'activitypub.ghost.org/unsubscribe',
            clicks: '71'
        },
        {
            url: 'example.com',
            clicks: '29'
        },
        {
            url: 'example.com/clickme',
            clicks: '13'
        }
    ];

    return (
        <Card {...props}>
            <CardHeader>
                <CardTitle>Click performance</CardTitle>
                <CardDescription>
                    Links in this newsletter
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">URL</TableHead>
                            <TableHead className="text-right">No. of members</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mockData.map((link) => {
                            return (
                                <TableRow key={link.url}>
                                    <TableCell className="font-medium">{link.url}</TableCell>
                                    <TableCell className="text-right text-gray-700">{link.clicks}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter>
                <Button variant="outline">See all &rarr;</Button>
            </CardFooter>
        </Card>
    );
};

export default ClickPerformance;
