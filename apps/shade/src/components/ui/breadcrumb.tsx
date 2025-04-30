import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {ChevronRight, MoreHorizontal} from 'lucide-react';

import {cn} from '@/lib/utils';

const Breadcrumb = React.forwardRef<
    HTMLElement,
    React.ComponentPropsWithoutRef<'nav'> & {
        separator?: React.ReactNode
    }
>(({...props}, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />);
Breadcrumb.displayName = 'Breadcrumb';

const BreadcrumbList = React.forwardRef<
    HTMLOListElement,
    React.ComponentPropsWithoutRef<'ol'>
>(({className, ...props}, ref) => (
    <ol
        ref={ref}
        className={cn(
            'flex flex-wrap items-center gap-1.5 break-words text-sm font-medium text-foreground/90 sm:gap-2.5 h-[34px]',
            className
        )}
        {...props}
    />
));
BreadcrumbList.displayName = 'BreadcrumbList';

const BreadcrumbItem = React.forwardRef<
    HTMLLIElement,
    React.ComponentPropsWithoutRef<'li'>
>(({className, ...props}, ref) => (
    <li
        ref={ref}
        className={cn('inline-flex items-center gap-1.5', className)}
        {...props}
    />
));
BreadcrumbItem.displayName = 'BreadcrumbItem';

const BreadcrumbLink = React.forwardRef<
    HTMLAnchorElement,
    React.ComponentPropsWithoutRef<'a'> & {
        asChild?: boolean
    }
>(({asChild, className, ...props}, ref) => {
    const Comp = asChild ? Slot : 'a';

    return (
        <Comp
            ref={ref}
            className={cn('transition-colors hover:text-muted-foreground', className)}
            {...props}
        />
    );
});
BreadcrumbLink.displayName = 'BreadcrumbLink';

const BreadcrumbPage = React.forwardRef<
    HTMLSpanElement,
    React.ComponentPropsWithoutRef<'span'>
>(({className, ...props}, ref) => (
    <span
        ref={ref}
        aria-current="page"
        aria-disabled="true"
        className={cn('font-normal text-muted-foreground', className)}
        role="link"
        {...props}
    />
));
BreadcrumbPage.displayName = 'BreadcrumbPage';

const BreadcrumbSeparator = ({
    children,
    className,
    ...props
}: React.ComponentProps<'li'>) => (
    <li
        aria-hidden="true"
        className={cn('[&>svg]:w-3.5 [&>svg]:h-3.5', className)}
        role="presentation"
        {...props}
    >
        {children ?? <ChevronRight />}
    </li>
);
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

const BreadcrumbEllipsis = ({
    className,
    ...props
}: React.ComponentProps<'span'>) => (
    <span
        aria-hidden="true"
        className={cn('flex h-9 w-9 items-center justify-center', className)}
        role="presentation"
        {...props}
    >
        <MoreHorizontal className="size-4" />
        <span className="sr-only">More</span>
    </span>
);
BreadcrumbEllipsis.displayName = 'BreadcrumbElipssis';

export {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
    BreadcrumbEllipsis
};
