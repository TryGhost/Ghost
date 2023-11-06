import clsx from 'clsx';
import React from 'react';

export interface ListItemProps {
    id?: string;
    title?: React.ReactNode;
    detail?: React.ReactNode;
    action?: React.ReactNode;
    hideActions?: boolean;
    avatar?: React.ReactNode;
    className?: string;
    testId?: string;

    /**
     * Hidden for the last item in the list
     */
    separator?: boolean;

    bgOnHover?: boolean;
    paddingRight?: boolean;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
    children?: React.ReactNode;
}

const ListItem: React.FC<ListItemProps> = ({
    id,
    title,
    detail,
    action,
    hideActions,
    avatar,
    className,
    testId,
    separator = true,
    bgOnHover = true,
    paddingRight = true,
    onClick,
    children
}) => {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(e);
    };

    const listItemClasses = clsx(
        'group/list-item flex items-center justify-between',
        bgOnHover && 'hover:bg-gradient-to-r hover:from-white hover:to-grey-50 dark:hover:from-black dark:hover:to-grey-950',
        separator ? 'border-b border-grey-100 last-of-type:border-b-transparent hover:border-grey-200 dark:border-grey-900 dark:hover:border-grey-800' : 'border-y border-transparent hover:border-grey-200 first-of-type:hover:border-t-transparent dark:hover:border-grey-800',
        className
    );

    return (
        <div className={listItemClasses} data-testid={testId}>
            {children ? children :
                <div className={`flex grow items-center gap-3 ${onClick && 'cursor-pointer'}`} onClick={handleClick}>
                    {avatar && avatar}
                    <div className={`flex grow flex-col py-3 pr-6`} id={id}>
                        <span>{title}</span>
                        {detail && <span className='text-xs text-grey-700'>{detail}</span>}
                    </div>
                </div>
            }
            {action &&
                <div className={`visible py-3 md:pl-6 ${paddingRight && 'md:pr-6'} ${hideActions ? 'group-hover/list-item:visible md:invisible' : ''}`}>
                    {action}
                </div>
            }
        </div>
    );
};

export default ListItem;
