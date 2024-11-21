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
        'group/list-item relative flex items-center justify-between',
        bgOnHover && 'hover:bg-grey-50 dark:hover:bg-grey-950',
        separator ? 'border-b border-grey-100 last-of-type:border-b-transparent dark:border-grey-900' : 'border-y border-transparent',
        onClick && 'cursor-pointer before:absolute before:inset-0 before:content-[""]',
        'hover:z-10 hover:border-b-transparent',
        '-mb-px pb-px', 
        className
    );

    return (
        <div className={listItemClasses} data-testid={testId} onClick={handleClick}>
            {bgOnHover && (
                <div className="absolute inset-0 -z-10 -mx-4 rounded-lg bg-grey-50 opacity-0 group-hover/list-item:opacity-100 dark:bg-grey-950" />
            )}
            <div className="relative flex w-full items-center justify-between">
                {children ? children :
                    <div className={`flex grow items-center gap-3`}>
                        {avatar && avatar}
                        <div className={`flex grow flex-col py-3 pr-6`} id={id}>
                            <span>{title}</span>
                            {detail && <span className='text-xs text-grey-700'>{detail}</span>}
                        </div>
                    </div>
                }
                {action &&
                    <div className={`visible py-3 md:pl-2 ${paddingRight && 'md:pr-2'} ${hideActions ? 'group-hover/list-item:visible md:invisible' : ''}`}>
                        {action}
                    </div>
                }
            </div>
        </div>
    );
};

export default ListItem;
