import {Button, Card, CardContent, CardFooter, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade';

const ClickPerformance = () => {
    const clicks = [
        {
            url: 'activitypub.ghost.org/archive',
            clicks: 174
        },
        {
            url: 'example.com',
            clicks: 67
        },
        {
            url: 'peterzimon.com/yo',
            clicks: 39
        },
        {
            url: 'github.com',
            clicks: 17
        },
        {
            url: 'activitypub.ghost.org/unsubscribe',
            clicks: 4
        }
    ];

    return (
        <Card className='col-span-2'>
            <CardHeader className='pb-0'>
                <CardTitle>Click performance</CardTitle>
            </CardHeader>
            <CardContent className='mt-[-10px] px-3'>
                <Table>
                    <TableHeader>
                        <TableRow className='hover:bg-transparent'>
                            <TableHead className="w-1/3">Links in this newsletter</TableHead>
                            <TableHead className="text-right">No. of members</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clicks.map(click => (
                            <TableRow key={click.url}>
                                <TableCell className="font-medium">
                                    {click.url}
                                </TableCell>
                                <TableCell className='text-right text-grey-700'>{click.clicks}</TableCell>
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

export default ClickPerformance;