import {cn} from '@/lib/utils';
import React from 'react';
import {Button, ButtonProps} from './button';
import {ArrowLeft, ArrowRight} from 'lucide-react';

/**
 * Use along with use-simple-pagination hook — see that file for more about how
 */

const SimplePagination = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, children, ...props}, ref) => {
    return (
        <div ref={ref} className={cn('flex items-center justify-between gap-4 pb-6 text-sm', className)} {...props}>
            {children}
        </div>
    );
});

SimplePagination.displayName = 'SimplePagination';

interface SimplePaginationPagesProps extends React.HTMLAttributes<HTMLSpanElement> {
    currentPage?: string,
    totalPages?: string
}

const SimplePaginationPages = React.forwardRef<HTMLSpanElement, SimplePaginationPagesProps>(({className, currentPage, totalPages, ...props}, ref) => {
    return (
        <span ref={ref} className={cn('text-muted-foreground', className)} {...props}>Pages {currentPage} of {totalPages}</span>
    );
});

SimplePaginationPages.displayName = 'SimplePaginationPages';

const SimplePaginationNavigation = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, children, ...props}, ref) => {
    return (
        <div ref={ref} className={cn('flex items-center gap-1.5', className)} {...props}>
            {children}
        </div>
    );
});

SimplePaginationNavigation.displayName = 'SimplePaginationNavigation';

const SimplePaginationPreviousButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({variant = 'outline', ...props}, ref) => {
        return (
            <Button ref={ref} size='sm' variant={variant} {...props}><ArrowLeft /></Button>
        );
    }
);

SimplePaginationPreviousButton.displayName = 'SimplePaginationPreviousButton';

const SimplePaginationNextButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({variant = 'outline', ...props}, ref) => {
        return (
            <Button ref={ref} size='sm' variant={variant} {...props}><ArrowRight /></Button>
        );
    }
);

SimplePaginationNextButton.displayName = 'SimplePaginationNextButton';

export {
    SimplePagination,
    SimplePaginationPages,
    SimplePaginationNavigation,
    SimplePaginationPreviousButton,
    SimplePaginationNextButton
};