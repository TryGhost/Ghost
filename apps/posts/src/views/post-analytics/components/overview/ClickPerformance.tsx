import * as React from 'react';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade';

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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">URL</TableHead>
                            <TableHead className="text-right">No. of members</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium">activitypub.ghost.org/archive</TableCell>
                            <TableCell className="text-right">250</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">example.com</TableCell>
                            <TableCell className="text-right">87</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">activitypub.ghost.org/unsubscribe</TableCell>
                            <TableCell className="text-right">12</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter>
                <Button variant="ghost">See all &rarr;</Button>
            </CardFooter>
        </Card>
    );
};

export default ClickPerformance;
