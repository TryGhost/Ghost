import React from 'react';
import clsx from 'clsx';

interface ListItemProps {
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
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
    children?: React.ReactNode;
}

const ListItem: React.FC<ListItemProps> = ({id, title, detail, action, hideActions, avatar, className, testId, separator, bgOnHover = true, onClick, children}) => {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(e);
    };

    separator = (separator === undefined) ? true : separator;
    const listItemClasses = clsx(
        'group flex items-center justify-between',
        bgOnHover && 'hover:bg-gradient-to-r hover:from-white hover:to-grey-50',
        separator ? 'border-b border-grey-100 last-of-type:border-b-transparent hover:border-grey-200' : 'border-y border-transparent hover:border-grey-200 first-of-type:hover:border-t-transparent',
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
                <div className={`px-6 py-3 ${hideActions ? 'invisible group-hover:visible' : ''}`}>
                    {action}
                </div>
            }
        </div>
    );
};

export default ListItem;
