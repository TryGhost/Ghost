import * as React from 'react';

import {cn} from '@/lib/utils';

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
    <div
        ref={ref}
        className={cn(
            'rounded-lg border border-neutral-200 bg-white text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50',
            className
        )}
        {...props}
    />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
    <div
        ref={ref}
        className={cn('flex flex-col space-y-1 p-5', className)}
        {...props}
    />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
    <div
        ref={ref}
        className={cn(
            'text-lg font-semibold leading-none tracking-tight',
            className
        )}
        {...props}
    />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
    <div
        ref={ref}
        className={cn('text-sm text-neutral-700 dark:text-neutral-400', className)}
        {...props}
    />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
    <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
    <div
        ref={ref}
        className={cn('flex items-center p-5 pt-0', className)}
        {...props}
    />
));
CardFooter.displayName = 'CardFooter';

export {Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent};
