import * as React from 'react';
import {Avatar, AvatarFallback, AvatarImage, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade';

interface ConversionsProps extends React.ComponentProps<typeof Card> {};

const Conversions: React.FC<ConversionsProps> = (props) => {
    const mockData = [
        {
            name: 'Gustavo Kenter',
            tier: 'Gold',
            avatarImage: 'https://i.pravatar.cc/150?img=1',
            avatarFallback: 'GK',
            receiveDate: 'A month ago'
        },
        {
            name: 'Kadin Botosh',
            tier: 'Free',
            avatarImage: '',
            avatarFallback: 'KB',
            receiveDate: 'A month ago'
        },
        {
            name: 'Skylar Lipshutz',
            tier: 'Free',
            avatarImage: 'https://i.pravatar.cc/150?img=2',
            avatarFallback: 'SL',
            receiveDate: 'A month ago'
        }
    ];

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
                        {mockData.map(member => (
                            <TableRow key={member.name}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <Avatar className='h-5 w-5'>
                                            <AvatarImage src={member.avatarImage} />
                                            <AvatarFallback>{member.avatarFallback}</AvatarFallback>
                                        </Avatar>
                                        <span className='whitespace-nowrap'>{member.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className='text-right text-gray-700'>{member.tier}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter>
                <Button variant="outline">See all &rarr;</Button>
            </CardFooter>
        </Card>
    );
};

export default Conversions;
