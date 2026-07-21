import * as React from 'react';
import {ArrowLeft} from 'lucide-react';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import {Button} from '@/components/ui/button';
import {Inline} from '@/components/primitives';
import {cn} from '@/lib/utils';

export interface BreadcrumbsItem {
    label: string;
    /** Rendered as a native button so the crumb stays keyboard-operable. */
    onClick?: () => void;
    /** Rendered as a plain link when given; takes precedence over onClick-only rendering. */
    href?: string;
}

export interface BreadcrumbsProps {
    /** Ancestor pages, rendered in order before the current page. */
    items: BreadcrumbsItem[];
    /** The current page, rendered as the non-interactive last crumb. */
    current: string;
    /** Renders a leading back-arrow button. When present, the crumb trail hides below the md breakpoint, leaving just the arrow. */
    onBack?: () => void;
    className?: string;
}

/**
 * Breadcrumbs composes the Breadcrumb primitives into the standard admin
 * trail: optional back arrow, ancestor links, chevron separators, and the
 * current page.
 */
function Breadcrumbs({items, current, onBack, className}: BreadcrumbsProps) {
    return (
        <Inline className={className} gap='sm'>
            {onBack && (
                <Button aria-label='Back' size='icon' variant='ghost' onClick={onBack}>
                    <ArrowLeft />
                </Button>
            )}
            <Breadcrumb className={cn(onBack && 'max-md:hidden')}>
                <BreadcrumbList className='whitespace-nowrap'>
                    {items.map(item => (
                        <React.Fragment key={item.label}>
                            <BreadcrumbItem>
                                {item.href ? (
                                    <BreadcrumbLink href={item.href} onClick={item.onClick}>
                                        {item.label}
                                    </BreadcrumbLink>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <button
                                            className='cursor-pointer rounded-sm focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden'
                                            type='button'
                                            onClick={item.onClick}
                                        >
                                            {item.label}
                                        </button>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                        </React.Fragment>
                    ))}
                    <BreadcrumbItem>
                        <BreadcrumbPage>{current}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
        </Inline>
    );
}

export {Breadcrumbs};
