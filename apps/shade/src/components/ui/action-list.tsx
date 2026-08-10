import {Slot} from '@radix-ui/react-slot';
import {type VariantProps, cva} from 'class-variance-authority';
import * as React from 'react';

import {cn} from '@/lib/utils';

const actionListItemVariants = cva(
    'group/action-list-item relative flex min-w-0 items-stretch border-b border-border last:border-b-transparent',
    {
        variants: {
            hover: {
                true: 'before:pointer-events-none before:absolute before:-inset-x-4 before:inset-y-0 before:z-0 before:rounded-md before:bg-table-row-hover before:opacity-0 before:transition-opacity hover:border-b-transparent hover:before:opacity-100',
                false: ''
            }
        },
        defaultVariants: {
            hover: true
        }
    }
);

const ActionList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, ...props}, ref) => (
    <div ref={ref} className={cn('flex flex-col', className)} {...props} />
));
ActionList.displayName = 'ActionList';

interface ActionListItemProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof actionListItemVariants> {}

const ActionListItem = React.forwardRef<HTMLDivElement, ActionListItemProps>(({className, hover, ...props}, ref) => (
    <div ref={ref} className={cn(actionListItemVariants({hover, className}))} {...props} />
));
ActionListItem.displayName = 'ActionListItem';

interface ActionListItemContentProps extends React.HTMLAttributes<HTMLDivElement> {
    asChild?: boolean;
}

const ActionListItemContent = React.forwardRef<HTMLDivElement, ActionListItemContentProps>(({asChild = false, className, ...props}, ref) => {
    const Component = asChild ? Slot : 'div';

    return <Component ref={ref} className={cn('relative z-10 min-w-0 grow', className)} {...props} />;
});
ActionListItemContent.displayName = 'ActionListItemContent';

const actionListItemActionsVariants = cva(
    'relative z-10 flex shrink-0 items-center py-3 pl-2',
    {
        variants: {
            visibility: {
                always: '',
                hover: 'md:opacity-0 md:transition-opacity md:group-focus-within/action-list-item:opacity-100 md:group-hover/action-list-item:opacity-100'
            }
        },
        defaultVariants: {
            visibility: 'always'
        }
    }
);

interface ActionListItemActionsProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof actionListItemActionsVariants> {}

const ActionListItemActions = React.forwardRef<HTMLDivElement, ActionListItemActionsProps>(({className, visibility, ...props}, ref) => (
    <div ref={ref} className={cn(actionListItemActionsVariants({visibility, className}))} {...props} />
));
ActionListItemActions.displayName = 'ActionListItemActions';

export {
    ActionList,
    ActionListItem,
    ActionListItemActions,
    ActionListItemContent
};
