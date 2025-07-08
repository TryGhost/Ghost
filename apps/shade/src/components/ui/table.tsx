import * as React from 'react';

import {cn} from '@/lib/utils';
import {Button} from './button';
import {cva, VariantProps} from 'class-variance-authority';

const Table = React.forwardRef<
    HTMLTableElement,
    React.HTMLAttributes<HTMLTableElement>
>(({className, ...props}, ref) => (
    <div className="relative w-full">
        <table
            ref={ref}
            className={cn('w-full caption-bottom text-sm', className)}
            {...props}
        />
    </div>
));
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({className, ...props}, ref) => (
    <thead ref={ref} className={cn('[&_tr:hover:before]:bg-transparent', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({className, ...props}, ref) => (
    <tbody
        ref={ref}
        className={cn('', className)}
        {...props}
    />
));
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({className, ...props}, ref) => (
    <tfoot
        ref={ref}
        className={cn(
            'border-b bg-muted/50 font-medium [&>tr]:last:border-b-0',
            className
        )}
        {...props}
    />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<
    HTMLTableRowElement,
    React.HTMLAttributes<HTMLTableRowElement>
>(({className, ...props}, ref) => (
    <tr
        ref={ref}
        className={cn(
            'group relative border-b data-[state=selected]:bg-muted',
            className
        )}
        {...props}
    />
));
TableRow.displayName = 'TableRow';

const headVariants = cva(
    'relative align-middle',
    {
        variants: {
            variant: {
                default: 'h-10 px-2 text-left text-xs font-medium uppercase tracking-wide text-gray-700 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
                cardhead: 'text-base font-normal [&>div]:px-0'
            }
        },
        defaultVariants: {
            variant: 'default'
        }
    }
);

export interface TableHeadProps
    extends React.ThHTMLAttributes<HTMLTableCellElement>,
    VariantProps<typeof headVariants> {
    asChild?: boolean
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(({className, variant, ...props}, ref) => (
    <th
        ref={ref}
        className={cn(headVariants({variant, className}))}
        {...props}
    />
));
TableHead.displayName = 'TableHead';

type TableHeadButtonProps = React.ComponentProps<typeof Button>;

const TableHeadButton: React.FC<TableHeadButtonProps> = ({className, children, ...props}) => {
    const buttonClassName = cn(
        'text-xs uppercase tracking-wide leading-4 text-right text-gray-700 hover:bg-transparent px-0 [&_svg]:size-4 gap-1',
        className
    );
    return (
        <Button className={buttonClassName} size='sm' variant='ghost' {...props}>
            {children}
        </Button>
    );
};
TableHeadButton.displayName = 'TableHeadButton';

const TableCell = React.forwardRef<
    HTMLTableCellElement,
    React.TdHTMLAttributes<HTMLTableCellElement>
>(({className, ...props}, ref) => (
    <td
        ref={ref}
        className={cn(
            'relative p-2.5 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] group-hover:bg-muted/50',
            className
        )}
        {...props}
    />
));
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<
    HTMLTableCaptionElement,
    React.HTMLAttributes<HTMLTableCaptionElement>
>(({className, ...props}, ref) => (
    <caption
        ref={ref}
        className={cn('mt-4 text-sm text-muted-foreground', className)}
        {...props}
    />
));
TableCaption.displayName = 'TableCaption';

export {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableHead,
    TableHeadButton,
    TableRow,
    TableCell,
    TableCaption
};
