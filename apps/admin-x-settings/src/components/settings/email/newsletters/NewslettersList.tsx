import Button from '../../../../admin-x-ds/global/Button';
// import List from '../../../../admin-x-ds/global/List';
// import ListItem from '../../../../admin-x-ds/global/ListItem';
import NewsletterDetailModal from './NewsletterDetailModal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import Table from '../../../../admin-x-ds/global/Table';
import TableCell from '../../../../admin-x-ds/global/TableCell';
import TableRow from '../../../../admin-x-ds/global/TableRow';

interface NewslettersListProps {
    tab?: string;
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
    tab
}) => {
    const action = tab === 'active-newsletters' ? (
        <Button color='green' label='Archive' link />
    ) : (
        <Button color='green' label='Activate' link />
    );

    return (
        <Table>
            <TableRow
                action={action}
                hideActions
                onClick={() => {
                    NiceModal.show(NewsletterDetailModal);
                }}>
                <TableCell>
                    <div className={`flex grow flex-col`}>
                        <span className='font-medium'>Amazing newsletter</span>
                        <span className='whitespace-nowrap text-xs text-grey-700'>This one is pretty good</span>
                    </div>
                </TableCell>
                <TableCell>
                    <div className={`flex grow flex-col`}>
                        <span>259</span>
                        <span className='whitespace-nowrap text-xs text-grey-700'>Subscribers</span>
                    </div>
                </TableCell>
                <TableCell>
                    <div className={`flex grow flex-col`}>
                        <span>14</span>
                        <span className='whitespace-nowrap text-xs text-grey-700'>Emails sent</span>
                    </div>
                </TableCell>
            </TableRow>
            <TableRow
                action={action}
                hideActions
                onClick={() => {
                    NiceModal.show(NewsletterDetailModal);
                }}>
                <TableCell>
                    <div className={`flex grow flex-col`}>
                        <span className='line-clamp-1 font-medium'>Crappy newsletter</span>
                        <span className='whitespace-nowrap text-xs text-grey-700'>This one is just spam</span>
                    </div>
                </TableCell>
                <TableCell>
                    <div className={`flex grow flex-col`}>
                        <span>145</span>
                        <span className='whitespace-nowrap text-xs text-grey-700'>Subscribers</span>
                    </div>
                </TableCell>
                <TableCell>
                    <div className={`flex grow flex-col`}>
                        <span>754</span>
                        <span className='whitespace-nowrap text-xs text-grey-700'>Emails sent</span>
                    </div>
                </TableCell>
            </TableRow>
        </Table>

    // Newsletter list previously used the List component, can be removed
    //
    // <List>
    //     <ListItem
    //         action={action}
    //         detail='This one is pretty good'
    //         title='Amazing newsletter'
    //         hideActions
    //         onClick={() => {
    //             NiceModal.show(NewsletterDetailModal);
    //         }}
    //     />
    //     <ListItem
    //         action={action}
    //         detail='This one is just spam'
    //         title='Awful newsletter'
    //         hideActions
    //         onClick={() => {
    //             NiceModal.show(NewsletterDetailModal);
    //         }}
    //     />
    // </List>
    );
};

export default NewslettersList;