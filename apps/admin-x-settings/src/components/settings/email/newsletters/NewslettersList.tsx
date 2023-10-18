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
    const {updateRoute} = useRouting();

    const showDetails = () => {
        updateRoute({route: `newsletters/${newsletter.id}`});
    };

    return (
        <TableRow action={<Button color='green' label='Edit' link onClick={showDetails} />} hideActions onClick={showDetails}>
            <TableCell onClick={showDetails}>
                <div className={`flex grow flex-col`}>
                    <span className='font-medium'>{newsletter.name}</span>
                    <span className='mt-0.5 text-xs leading-tight text-grey-700'>{newsletter.description || 'No description'}</span>
                </div>
            </TableCell>
            <TableCell className='hidden md:!visible md:!table-cell' onClick={showDetails}>
                <div className={`flex grow flex-col`}>
                    <span>{numberWithCommas(newsletter.count?.active_members || 0) }</span>
                    <span className='mt-0.5 whitespace-nowrap text-xs leading-tight text-grey-700'>Subscribers</span>
                </div>
            </TableCell>
            <TableCell className='hidden md:!visible md:!table-cell' onClick={showDetails}>
                <div className={`flex grow flex-col`}>
                    <span>{numberWithCommas(newsletter.count?.posts || 0)}</span>
                    <span className='mt-0.5 whitespace-nowrap text-xs leading-tight text-grey-700'>Delivered</span>
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
