import Button from '../../../../admin-x-ds/global/Button';
import NoValueLabel from '../../../../admin-x-ds/global/NoValueLabel';
import React from 'react';
import Table from '../../../../admin-x-ds/global/Table';
import TableCell from '../../../../admin-x-ds/global/TableCell';
import TableRow from '../../../../admin-x-ds/global/TableRow';
import useRouting from '../../../../hooks/useRouting';
import {Newsletter} from '../../../../api/newsletters';
import {numberWithCommas} from '../../../../utils/helpers';

interface NewslettersListProps {
    newsletters: Newsletter[]
}

const NewsletterItem: React.FC<{newsletter: Newsletter}> = ({newsletter}) => {
    // const {mutateAsync: editNewsletter} = useEditNewsletter();
    const {updateRoute} = useRouting();
    // const limiter = useLimiter();
    // const action = newsletter.status === 'active' ? (
    //     <Button color='red' disabled={onlyOne} label='Archive' link onClick={() => {
    //         NiceModal.show(ConfirmationModal, {
    //             title: 'Archive newsletter',
    //             prompt: <>
    //                 <p>Your newsletter <strong>{newsletter.name}</strong> will no longer be visible to members or available as an option when publishing new posts.</p>
    //                 <p>Existing posts previously sent as this newsletter will remain unchanged.</p>
    //             </>,
    //             okLabel: 'Archive',
    //             onOk: async (modal) => {
    //                 await editNewsletter({...newsletter, status: 'archived'});
    //                 modal?.remove();
    //             }
    //         });
    //     }} />
    // ) : (
    //     <Button color='green' label='Activate' link onClick={async () => {
    //         try {
    //             await limiter?.errorIfWouldGoOverLimit('newsletters');
    //         } catch (error) {
    //             if (error instanceof HostLimitError) {
    //                 NiceModal.show(LimitModal, {
    //                     prompt: error.message || `Your current plan doesn't support more newsletters.`
    //                 });
    //                 return;
    //             } else {
    //                 throw error;
    //             }
    //         }

    //         NiceModal.show(ConfirmationModal, {
    //             title: 'Reactivate newsletter',
    //             prompt: <>
    //                 Reactivating <strong>{newsletter.name}</strong> will immediately make it visible to members and re-enable it as an option when publishing new posts.
    //             </>,
    //             okLabel: 'Reactivate',
    //             onOk: async (modal) => {
    //                 await editNewsletter({...newsletter, status: 'active'});
    //                 modal?.remove();
    //             }
    //         });
    //     }} />
    // );

    const showDetails = () => {
        updateRoute({route: `newsletters/show/${newsletter.id}`});
    };

    return (
        <TableRow action={<Button color='green' label='Edit' link onClick={showDetails} />} hideActions onClick={showDetails}>
            <TableCell onClick={showDetails}>
                <div className={`flex grow flex-col`}>
                    <span className='font-medium'>{newsletter.name}</span>
                    <span className='whitespace-nowrap text-xs text-grey-700'>{newsletter.description || 'No description'}</span>
                </div>
            </TableCell>
            <TableCell className='hidden md:!visible md:!table-cell' onClick={showDetails}>
                <div className={`flex grow flex-col`}>
                    <span>{numberWithCommas(newsletter.count?.active_members || 0) }</span>
                    <span className='whitespace-nowrap text-xs text-grey-700'>Subscribers</span>
                </div>
            </TableCell>
            <TableCell className='hidden md:!visible md:!table-cell' onClick={showDetails}>
                <div className={`flex grow flex-col`}>
                    <span>{numberWithCommas(newsletter.count?.posts || 0)}</span>
                    <span className='whitespace-nowrap text-xs text-grey-700'>Delivered</span>
                </div>
            </TableCell>
        </TableRow>
    );
};

const NewslettersList: React.FC<NewslettersListProps> = ({newsletters}) => {
    if (newsletters.length) {
        return <Table>
            {newsletters.map(newsletter => <NewsletterItem key={newsletter.id} newsletter={newsletter} />)}
        </Table>;
    } else {
        return <NoValueLabel icon='mail-block'>
            No newsletters found.
        </NoValueLabel>;
    }
};

export default NewslettersList;
