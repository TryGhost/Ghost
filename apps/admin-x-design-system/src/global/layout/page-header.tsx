import clsx from 'clsx';
import React from 'react';

export interface PageHeaderProps {

    /**
     * Use these to specifically place elements on the left | center | right of the header.
     */
    left?: React.ReactNode;
    center?: React.ReactNode;
    right?: React.ReactNode;

    sticky?: boolean;
    containerClassName?: string;

    /**
     * Or you can simply use the whole container to make sure header spacing is consistent. `children` takes precedence over `left`, `center` and `right`.
     */
    children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
    left,
    center,
    right,
    sticky = true,
    containerClassName,
    children
}) => {
    const containerClasses = clsx(
        'z-50 h-22 min-h-[92px] p-8',
        !children && 'flex items-center justify-between gap-3',
        sticky && 'sticky top-0',
        containerClassName
    );

    if (!children) {
        if (left) {
            const leftClasses = clsx(
                'flex flex-auto items-center',
                (right && center) && 'basis-1/3',
                ((!right && center)) && 'basis-1/2'
            );
            left = <div className={leftClasses}>{left}</div>;
        }
        if (center) {
            const centerClasses = clsx(
                'flex flex-auto items-center justify-center',
                (left && right) && 'basis-1/3',
                ((left && !right) || (!left && right)) && 'basis-1/2'
            );
            center = <div className={centerClasses}>{center}</div>;
        }
        if (right) {
            const rightClasses = clsx(
                'flex flex-auto items-center justify-end',
                (left && center) && 'basis-1/3',
                ((!left && center)) && 'basis-1/2'
            );
            right = <div className={rightClasses}>{right}</div>;
        }
    }

    return (
        <div className={containerClasses}>
            {children ? children :
                <>
                    {left}
                    {center}
                    {right}
                </>
            }
        </div>
    );
};

export default PageHeader;
