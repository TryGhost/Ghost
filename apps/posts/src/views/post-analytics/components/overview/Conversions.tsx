import * as React from 'react';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade';

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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead className="w-[100px] text-right">Tier</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium">Tiana Baptista</TableCell>
                            <TableCell className="text-right">Free</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">Chance Ekstrom Bothman</TableCell>
                            <TableCell className="text-right">Free</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">tatiana@calzoni.pizza</TableCell>
                            <TableCell className="text-right">Paid</TableCell>
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

export default Conversions;
