import * as React from 'react';
import {Avatar, AvatarFallback, AvatarImage, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade';

interface openedListProps {};

const OpenedList: React.FC<openedListProps> = () => {
    const mockData = [
        {
            name: 'Kaylynn Torff',
            tier: 'Silver',
            avatarImage: 'https://i.pravatar.cc/150?img=3',
            avatarFallback: 'KT',
            receiveDate: 'A month ago'
        },
        {
            name: 'Abram Vaccaro',
            tier: 'Gold',
            avatarImage: 'https://i.pravatar.cc/150?img=4',
            avatarFallback: 'AV',
            receiveDate: 'A month ago'
        },
        {
            name: 'Jaxson Westervelt',
            tier: 'Free',
            avatarImage: '',
            avatarFallback: 'JW',
            receiveDate: 'A month ago'
        },
        {
            name: 'Kierra Bergson',
            tier: 'Gold',
            avatarImage: 'https://i.pravatar.cc/150?img=5',
            avatarFallback: 'KB',
            receiveDate: 'A month ago'
        }
    ];

    return (
        <Table>
            <TableHeader>
                <TableRow className='h-[44px]'>
                    <TableHead className="w-1/3">Member</TableHead>
                    <TableHead className="w-1/3">Tier</TableHead>
                    <TableHead className="w-1/3">Opened</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {mockData.map(member => (
                    <TableRow key={member.name}>
                        <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5">
                                <Avatar>
                                    <AvatarImage src={member.avatarImage} />
                                    <AvatarFallback>{member.avatarFallback}</AvatarFallback>
                                </Avatar>
                                <span className='whitespace-nowrap'>{member.name}</span>
                            </div>
                        </TableCell>
                        <TableCell className='text-gray-800'>{member.tier}</TableCell>
                        <TableCell className='text-gray-800'>{member.receiveDate}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

export default OpenedList;
