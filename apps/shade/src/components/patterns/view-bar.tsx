import React from 'react';
import {Inline} from '@/components/primitives';
import {cn} from '@/lib/utils';

type PropsWithChildrenAndClassName = React.PropsWithChildren & {
    className?: string;
};

// ---------------------------------------------------------------------------
// Nav — flex-1 left side, gives PageMenu a measurable width for responsive collapse
// ---------------------------------------------------------------------------

function ViewBarNav({className, children}: PropsWithChildrenAndClassName) {
    return (
        <Inline
            align='center'
            className={cn('flex-1 min-w-0', className)}
            data-slot='view-bar-nav'
            gap='sm'
        >
            {children}
        </Inline>
    );
}

// ---------------------------------------------------------------------------
// Actions — shrink-0 right side (date-range picker, etc.)
// ---------------------------------------------------------------------------

function ViewBarActions({className, children}: PropsWithChildrenAndClassName) {
    return (
        <Inline
            align='center'
            className={cn('shrink-0', className)}
            data-slot='view-bar-actions'
            gap='sm'
        >
            {children}
        </Inline>
    );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

type ViewBarComponent = React.FC<PropsWithChildrenAndClassName> & {
    Nav: React.FC<PropsWithChildrenAndClassName>;
    Actions: React.FC<PropsWithChildrenAndClassName>;
};

const ViewBar: ViewBarComponent = Object.assign(
    function ViewBar({className, children}: PropsWithChildrenAndClassName) {
        return (
            <Inline
                align='center'
                className={cn('w-full', className)}
                data-slot='view-bar'
                gap='lg'
                justify='between'
            >
                {children}
            </Inline>
        );
    },
    {
        Nav: ViewBarNav,
        Actions: ViewBarActions
    }
);

export {ViewBar, ViewBarNav, ViewBarActions};
