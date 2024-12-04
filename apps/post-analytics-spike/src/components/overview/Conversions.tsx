import {Avatar, AvatarFallback, AvatarImage, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Table, TableBody, TableCell, TableRow} from '@tryghost/shade';

const Conversions = () => {
    const members = [
        {
            name: 'Gustavo Kenter',
            tier: 'Gold',
            avatarImage: 'https://i.pravatar.cc/150?img=1',
            avatarFallback: 'GK'
        },
        {
            name: 'Kadin Botosh',
            tier: 'Free',
            avatarImage: '',
            avatarFallback: 'KB'
        },
        {
            name: 'Skylar Lipshutz',
            tier: 'Free',
            avatarImage: 'https://i.pravatar.cc/150?img=2',
            avatarFallback: 'SL'
        }
    ];

    return (
        <Card className='flex flex-col'>
            <CardHeader>
                <CardTitle>Conversion</CardTitle>
                <CardDescription>3 members signed up on this post</CardDescription>
            </CardHeader>
            <CardContent className='mt-[-10px] grow px-3'>
                <Table>
                    <TableBody>
                        {members.map(member => (
                            <TableRow key={member.name}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-3">
                                        <Avatar className='h-6 w-6'>
                                            <AvatarImage src={member.avatarImage} />
                                            <AvatarFallback>{member.avatarFallback}</AvatarFallback>
                                        </Avatar>
                                        <span className='whitespace-nowrap'>{member.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className='text-grey-700'>{member.tier}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter>
                <Button className='h-auto p-0' variant='link'>Details &rarr;</Button>
            </CardFooter>
        </Card>
    );
};

export default Conversions;