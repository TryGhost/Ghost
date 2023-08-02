import Button from '../../../../admin-x-ds/global/Button';
import NewsletterDetailModal from './NewsletterDetailModal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import Table from '../../../../admin-x-ds/global/Table';
import TableCell from '../../../../admin-x-ds/global/TableCell';
import TableRow from '../../../../admin-x-ds/global/TableRow';
import {Newsletter} from '../../../../types/api';

interface NewslettersListProps {
    tab?: string;
    newsletters: Newsletter[]
}

// We should create a NewsletterItem component based on TableRow and then loop through newsletters
//
// interface NewsletterItemProps {
//     name: string;
//     description: string;
//     subscribers: number;
//     emailsSent: number;
// }

// const NewsletterItem: React.FC<NewsletterItemProps> = ({name, description, subscribers, emailsSent}) => {
//     const action = tab === 'active-newsletters' ? (
//         <Button color='green' label='Archive' link />
//     ) : (
//         <Button color='green' label='Activate' link />
//     );

//     return (
//         <TableRow
//             action={action}
//             onClick={() => {
//                 NiceModal.show(NewsletterDetailModal);
//             }}>
//             hideActions
//             separator
//         >
//             <TableCell>
//                 <div className={`flex grow flex-col`}>
//                     <span className='font-medium'>{name}</span>
//                     <span className='whitespace-nowrap text-xs text-grey-700'>{description}</span>
//                 </div>
//             </TableCell>
//             <TableCell>
//                 <div className={`flex grow flex-col`}>
//                     <span>{subscribers}</span>
//                     <span className='whitespace-nowrap text-xs text-grey-700'>Subscribers</span>
//                 </div>
//             </TableCell>
//             <TableCell>
//                 <div className={`flex grow flex-col`}>
//                     <span>{emailsSent}</span>
//                     <span className='whitespace-nowrap text-xs text-grey-700'>Emails sent</span>
//                 </div>
//             </TableCell>
//         </TableRow>
//     );
// };

const NewslettersList: React.FC<NewslettersListProps> = ({
    tab,
    newsletters
}) => {
    const action = tab === 'active-newsletters' ? (
        <Button color='green' label='Archive' link />
    ) : (
        <Button color='green' label='Activate' link />
    );

    return (
        <Table>
            {newsletters.map(newsletter => (
                <TableRow
                    action={action}
                    hideActions
                    onClick={() => {
                        NiceModal.show(NewsletterDetailModal, {newsletter});
                    }}>
                    <TableCell>
                        <div className={`flex grow flex-col`}>
                            <span className='font-medium'>{newsletter.name}</span>
                            <span className='whitespace-nowrap text-xs text-grey-700'>{newsletter.description || 'No description'}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className={`flex grow flex-col`}>
                            <span>{newsletter.count?.active_members}</span>
                            <span className='whitespace-nowrap text-xs text-grey-700'>Subscribers</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className={`flex grow flex-col`}>
                            <span>{newsletter.count?.posts}</span>
                            <span className='whitespace-nowrap text-xs text-grey-700'>Posts sent</span>
                        </div>
                    </TableCell>
                </TableRow>
            ))}
        </Table>
    );
};

export default NewslettersList;
