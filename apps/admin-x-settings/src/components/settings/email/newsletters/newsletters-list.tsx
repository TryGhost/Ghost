import React from 'react';
import {ActionList, ActionListItem, ActionListItemActions, ActionListItemContent, Button, DragIndicator, LoadingIndicator, NoValueLabel, NoValueLabelIcon, type SortableItemContainerProps, SortableList} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import {type Newsletter} from '@tryghost/admin-x-framework/api/newsletters';
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
        <ActionListItem ref={setRef} className={isDragging ? 'opacity-75' : ''} style={style}>
            <ActionListItemContent className='flex'>
                {(props.dragHandleAttributes || isDragging) && <Inline align='center' className='w-10 shrink-0'>
                    <DragIndicator className='h-10' isDragging={isDragging || false} {...props} />
                </Inline>}
                <button className='flex min-w-0 grow text-left' type='button' onClick={showDetails}>
                    {children}
                </button>
            </ActionListItemContent>
            <ActionListItemActions><Button className='h-auto p-0 font-bold text-green hover:text-green/90 hover:no-underline' data-testid='edit-newsletter-button' size='sm' type='button' variant='link' onClick={showDetails}>Edit</Button></ActionListItemActions>
        </ActionListItem>
    );

    if (isDragging) {
        return <ActionList>{container}</ActionList>;
    } else {
        return container;
    }
};

const NewsletterItem: React.FC<{newsletter: Newsletter}> = ({newsletter}) => {
    return (
        <>
            <div className='grow py-3 pr-6'>
                <div className={`flex grow flex-col`}>
                    <span className='font-medium'>{newsletter.name}</span>
                    <span className='mt-0.5 text-sm leading-tight text-muted-foreground'>{newsletter.description || 'No description'}</span>
                </div>
            </div>
            <div className='hidden py-3 pr-6 md:block md:min-w-[11rem]'>
                <div className={`flex grow flex-col`}>
                    <span>{formatNumber(newsletter.count?.active_members || 0) }</span>
                    <span className='mt-0.5 text-sm leading-tight whitespace-nowrap text-muted-foreground'>Subscribers</span>
                </div>
            </div>
            <div className='hidden py-3 pr-6 md:block md:min-w-[11rem]'>
                <div className={`flex grow flex-col`}>
                    <span>{formatNumber(newsletter.count?.posts || 0)}</span>
                    <span className='mt-0.5 text-sm leading-tight whitespace-nowrap text-muted-foreground'>Delivered</span>
                </div>
            </div>
        </>
    );
};

const NewslettersList: React.FC<NewslettersListProps> = ({newsletters, isLoading, isSortable, onSort}) => {
    if (isLoading) {
        return <div className='flex justify-center p-5'><LoadingIndicator size='md' /></div>;
    } else if (newsletters.length && isSortable) {
        return <SortableList
            container={props => <NewsletterItemContainer {...props} />}
            getDragHandleLabel={item => `Reorder ${item.name}`}
            items={newsletters}
            renderItem={item => <NewsletterItem newsletter={item} />}
            wrapper={ActionList}
            onMove={(id, overId) => onSort?.(id, overId)}
        />;
    } else if (newsletters.length) {
        return <ActionList>
            {newsletters.map(newsletter => (
                <NewsletterItemContainer key={newsletter.id} id={newsletter.id}>
                    <NewsletterItem newsletter={newsletter} />
                </NewsletterItemContainer>
            ))}
        </ActionList>;
    } else {
        return <NoValueLabel>
            <NoValueLabelIcon><LucideIcon.Mail /></NoValueLabelIcon>
            No newsletters found.
        </NoValueLabel>;
    }
};

export default NewslettersList;
