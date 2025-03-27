import React from 'react';
import {Button, DragIndicator, NoValueLabel, SortableItemContainerProps, SortableList, Table, TableCell, TableRow} from '@tryghost/admin-x-design-system';
import {Newsletter} from '@tryghost/admin-x-framework/api/newsletters';
import {numberWithCommas} from '../../../../utils/helpers';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface NewslettersListProps {
    newsletters: Newsletter[];
    isLoading: boolean;
    isSortable?: boolean;
    onSort?: (activeId: string, overId?: string) => void;
}

const NewsletterItemContainer: React.FC<Partial<SortableItemContainerProps>> = ({
    id,
    setRef,
    isDragging,
    style,
    children,
    ...props
}) => {
    const {updateRoute} = useRouting();

    const showDetails = () => {
        updateRoute({route: `newsletters/${id}`});
    };

    const container = (
        <TableRow ref={setRef}
            action={<Button color='green' data-testid="edit-newsletter-button" label='Edit' link onClick={showDetails} />}
            className={isDragging ? 'opacity-75' : ''}
            hideActions={false}
            style={style}
            onClick={showDetails}
        >
            {(props.dragHandleAttributes || isDragging) && <TableCell className='w-10 !align-middle' >
                <DragIndicator className='h-10' isDragging={isDragging || false} {...props} />
            </TableCell>}
            {children}
        </TableRow>
    );

    if (isDragging) {
        return <Table>{container}</Table>;
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
            <TableCell className='w-full' onClick={showDetails}>
                <div className={`flex grow flex-col`}>
                    <span className='font-medium'>{newsletter.name}</span>
                    <span className='mt-0.5 text-xs leading-tight text-grey-700'>{newsletter.description || 'No description'}</span>
                </div>
            </TableCell>
            <TableCell className='hidden md:!visible md:!table-cell md:min-w-[11rem]' onClick={showDetails}>
                <div className={`flex grow flex-col`}>
                    <span>{numberWithCommas(newsletter.count?.active_members || 0) }</span>
                    <span className='mt-0.5 whitespace-nowrap text-xs leading-tight text-grey-700'>Subscribers</span>
                </div>
            </TableCell>
            <TableCell className='hidden md:!visible md:!table-cell md:min-w-[11rem]' onClick={showDetails}>
                <div className={`flex grow flex-col`}>
                    <span>{numberWithCommas(newsletter.count?.posts || 0)}</span>
                    <span className='mt-0.5 whitespace-nowrap text-xs leading-tight text-grey-700'>Delivered</span>
                </div>
            </TableCell>
        </>
    );
};

const NewslettersList: React.FC<NewslettersListProps> = ({newsletters, isLoading, isSortable, onSort}) => {
    if (isLoading) {
        return <Table isLoading />;
    } else if (newsletters.length && isSortable) {
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
