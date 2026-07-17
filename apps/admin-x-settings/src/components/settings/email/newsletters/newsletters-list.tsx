import React from 'react';
import {Button, DragIndicator, type SortableItemContainerProps, SortableList, Table, TableRow} from '@tryghost/admin-x-design-system';
import {Inline} from '@tryghost/shade/primitives';
import {MailX} from 'lucide-react';
import {type Newsletter} from '@tryghost/admin-x-framework/api/newsletters';
import {NoValueLabel, NoValueLabelIcon} from '@tryghost/shade/components';
import {formatNumber} from '@tryghost/shade/utils';
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
    separator,
    ...props
}) => {
    void separator; // we don't use the separator prop and it will error if it gets passed to the DragIndicator component

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
            <Inline className='w-full' gap='none'>
                {(props.dragHandleAttributes || isDragging) && <div className='w-10 shrink-0'>
                    <DragIndicator className='h-10' isDragging={isDragging || false} {...props} />
                </div>}
                {children}
            </Inline>
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
            <div className='grow py-3 pr-6' onClick={showDetails}>
                <div className={`flex grow flex-col`}>
                    <span className='font-medium'>{newsletter.name}</span>
                    <span className='mt-0.5 text-sm leading-tight text-grey-700'>{newsletter.description || 'No description'}</span>
                </div>
            </div>
            <div className='hidden py-3 pr-6 md:block md:min-w-[11rem]' onClick={showDetails}>
                <div className={`flex grow flex-col`}>
                    <span>{formatNumber(newsletter.count?.active_members || 0) }</span>
                    <span className='mt-0.5 text-sm leading-tight whitespace-nowrap text-grey-700'>Subscribers</span>
                </div>
            </div>
            <div className='hidden py-3 pr-6 md:block md:min-w-[11rem]' onClick={showDetails}>
                <div className={`flex grow flex-col`}>
                    <span>{formatNumber(newsletter.count?.posts || 0)}</span>
                    <span className='mt-0.5 text-sm leading-tight whitespace-nowrap text-grey-700'>Delivered</span>
                </div>
            </div>
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
                <NewsletterItemContainer key={newsletter.id} id={newsletter.id}>
                    <NewsletterItem newsletter={newsletter} />
                </NewsletterItemContainer>
            ))}
        </Table>;
    } else {
        return <NoValueLabel>
            <NoValueLabelIcon><MailX /></NoValueLabelIcon>
            No newsletters found.
        </NoValueLabel>;
    }
};

export default NewslettersList;
