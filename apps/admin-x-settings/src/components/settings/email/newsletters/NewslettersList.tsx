import React from 'react';
import clsx from 'clsx';
import useRouting from '../../../../hooks/useRouting';
import {Button, Icon, NoValueLabel, SortableItemContainerProps, SortableList, Table, TableCell, TableRow} from '@tryghost/admin-x-design-system';
import {Newsletter} from '../../../../api/newsletters';
import {numberWithCommas} from '../../../../utils/helpers';

interface NewslettersListProps {
    newsletters: Newsletter[];
    isSortable?: boolean;
    onSort?: (activeId: string, overId?: string) => void;
}

const NewsletterItemContainer: React.FC<Partial<SortableItemContainerProps>> = ({
    id,
    setRef,
    isDragging,
    dragHandleAttributes,
    dragHandleListeners,
    dragHandleClass,
    style,
    children
}) => {
    const {updateRoute} = useRouting();

    const showDetails = () => {
        updateRoute({route: `newsletters/${id}`});
    };

    const container = (
        <TableRow
            ref={setRef}
            action={<Button color='green' label='Edit' link onClick={showDetails} />}
            className={isDragging ? 'opacity-75' : ''}
            style={style}
            hideActions
            onClick={showDetails}
        >
            {(dragHandleAttributes || isDragging) && <TableCell className='flex items-center'>
                <button
                    className={clsx(
                        'h-10 opacity-50 group-hover:opacity-100',
                        isDragging ? 'cursor-grabbing' : 'cursor-grab',
                        dragHandleClass
                    )}
                    type='button'
                    {...dragHandleAttributes}
                    {...dragHandleListeners}
                >
                    <Icon colorClass='text-grey-500' name='hamburger' size='sm' />
                </button>
            </TableCell>}
            {children}
        </TableRow>
    );

    if (isDragging) {
        return <table><tbody>{container}</tbody></table>;
    } else {
        return container;
    }
};

const NewsletterItem: React.FC<{newsletter: Newsletter}> = ({newsletter}) => {
    const {updateRoute} = useRouting();

    const showDetails = () => {
        updateRoute({route: `newsletters/${newsletter.id}`});
    };

    return (
        <>
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
        </>
    );
};

const NewslettersList: React.FC<NewslettersListProps> = ({newsletters, isSortable, onSort}) => {
    if (newsletters.length && isSortable) {
        return <SortableList
            container={props => <NewsletterItemContainer {...props} />}
            items={newsletters}
            renderItem={item => <NewsletterItem newsletter={item} />}
            wrapper={Table}
            onMove={(id, overId) => onSort?.(id, overId)}
        />;
    } else if (newsletters.length) {
        return <Table>
            {newsletters.map(newsletter => (
                <NewsletterItemContainer id={newsletter.id}>
                    <NewsletterItem newsletter={newsletter} />
                </NewsletterItemContainer>
            ))}
        </Table>;
    } else {
        return <NoValueLabel icon='mail-block'>
            No newsletters found.
        </NoValueLabel>;
    }
};

export default NewslettersList;
