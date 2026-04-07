import {Inline} from '@/components/primitives';
import {cn} from '@/lib/utils';
import React from 'react';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ViewHeaderActionsProps extends React.HTMLAttributes<HTMLElement> {}

/**
 * @deprecated Prefer composing inline action rows with the `Inline` primitive.
 */
const ViewHeaderActions:React.FC<ViewHeaderActionsProps> = ({children}) => {
    return (
        <Inline align='center' className='flex items-center gap-2' gap='sm'>
            {children}
        </Inline>
    );
};

interface ViewHeaderProps extends React.HTMLAttributes<HTMLElement> {
    className?: string;
}

/**
 * @deprecated Prefer composing view header shells with `Inline`, `Stack`, and `Text` primitives.
 */
const ViewHeader:React.FC<ViewHeaderProps> = ({className, children}) => {
    const [headerComponent, actionsComponent] = React.Children.toArray(children);

    return (
        <header className='sticky top-0 z-50 -mx-8 bg-surface-page/70 backdrop-blur-md'>
            <Inline
                align='center'
                className={cn('relative min-h-[102px] gap-5 p-8 before:absolute before:inset-x-8 before:bottom-0 before:block before:border-b before:border-border-default before:content-[""]', className)}
                justify='between'
            >
                {headerComponent}
                {actionsComponent}
            </Inline>
        </header>
    );
};

export {ViewHeader, ViewHeaderActions};
