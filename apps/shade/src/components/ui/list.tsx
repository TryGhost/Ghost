import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';
import { rowSurface, rowSurfaceClasses } from '@/components/ui/row-surface';
import { useRowBehavior } from '@/hooks/use-row-behavior';

const List = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col', className)} {...props} />
  ),
);
List.displayName = 'List';

interface ListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  hover?: boolean | null;
}

const rowEvents = [
  'onClick',
  'onClickCapture',
  'onAuxClick',
  'onPointerDown',
  'onPointerMove',
  'onPointerUp',
  'onPointerCancel',
  'onPointerLeave',
] as const;

const ListItem = React.forwardRef<HTMLDivElement, ListItemProps>(
  ({ asChild = false, className, hover, children, ...props }, ref) => {
    const child =
      asChild && React.isValidElement<React.HTMLAttributes<HTMLDivElement>>(children)
        ? children
        : undefined;
    const rowProps = { ...props };
    if (child) {
      for (const name of rowEvents) {
        const childHandler = child.props[name];
        const ownHandler = props[name];
        if (childHandler) {
          // The Slot would otherwise call the child's handler a second time.
          rowProps[name] = ((event: never) => {
            childHandler(event);
            ownHandler?.(event);
          }) as typeof childHandler;
        }
      }
    }
    const behavior = useRowBehavior(rowProps, hover === null ? false : hover);
    const Component = asChild ? Slot : 'div';
    const slotChild = child
      ? React.cloneElement(child, Object.fromEntries(rowEvents.map((name) => [name, undefined])))
      : children;
    return (
      <Component
        ref={ref}
        className={cn(
          !asChild &&
            'relative flex min-w-0 items-stretch border-b border-border last:border-b-transparent',
          'group/action-list-item',
          rowSurface(
            hover === false || hover === null
              ? 'static'
              : hover || rowProps.onClick
                ? 'interactive'
                : 'auto',
          ),
          className,
        )}
        {...rowProps}
        {...behavior}
      >
        {slotChild}
      </Component>
    );
  },
);
ListItem.displayName = 'ListItem';

interface ListItemContentProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

const ListItemContent = React.forwardRef<HTMLDivElement, ListItemContentProps>(
  ({ asChild = false, className, ...props }, ref) => {
    const Component = asChild ? Slot : 'div';

    return (
      <Component
        ref={ref}
        className={cn('z-10 min-w-0 grow', asChild && rowSurfaceClasses.primaryAction, className)}
        {...props}
      />
    );
  },
);
ListItemContent.displayName = 'ListItemContent';

const listItemActionsVariants = cva('relative z-10 flex shrink-0 items-center py-3 pl-2', {
  variants: {
    visibility: {
      always: '',
      hover:
        'md:opacity-0 md:transition-opacity md:group-focus-within/action-list-item:opacity-100 md:group-hover/action-list-item:opacity-100',
    },
  },
  defaultVariants: {
    visibility: 'always',
  },
});

interface ListItemActionsProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof listItemActionsVariants> {}

const ListItemActions = React.forwardRef<HTMLDivElement, ListItemActionsProps>(
  ({ className, visibility, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          listItemActionsVariants({ visibility, className }),
          'pointer-events-none [&>*]:pointer-events-auto',
        )}
        {...props}
      />
    );
  },
);
ListItemActions.displayName = 'ListItemActions';

/** @deprecated Use List instead. */
const ActionList = List;
/** @deprecated Use ListItem instead. */
const ActionListItem = ListItem;
/** @deprecated Use ListItemActions instead. */
const ActionListItemActions = ListItemActions;
/** @deprecated Use ListItemContent instead. */
const ActionListItemContent = ListItemContent;

export {
  List,
  ListItem,
  ListItemActions,
  ListItemContent,
  ActionList,
  ActionListItem,
  ActionListItemActions,
  ActionListItemContent,
};
