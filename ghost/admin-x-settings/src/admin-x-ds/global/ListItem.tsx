import React from 'react';

interface ListItemProps {
    id: string;
    title?: React.ReactNode;
    detail?: React.ReactNode;
    action?: React.ReactNode;
    hideActions?: boolean;
    avatar?: React.ReactNode;

    /**
     * Hidden for the last item in the list
     */
    separator?: boolean;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const ListItem: React.FC<ListItemProps> = ({id, title, detail, action, hideActions, avatar, separator, onClick}) => {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(e);
    };

    separator = (separator === undefined) ? true : separator;

    return (
        <div className={`group flex items-center justify-between hover:bg-gradient-to-r hover:from-white hover:to-grey-50 ${separator ? 'border-b border-grey-100 last-of-type:border-none' : ''}`}>
            <div className={`flex grow items-center gap-3 ${onClick && 'cursor-pointer'}`} onClick={handleClick}>
                {avatar && avatar}
                <div className={`flex grow flex-col pr-6 ${separator ? 'py-3' : 'py-2'}`} id={id}>
                    <span>{title}</span>
                    {detail && <span className='text-xs text-grey-700'>{detail}</span>}
                </div>
            </div>
            {action && 
                <div className={`px-6 ${separator ? 'py-3' : 'py-2'} ${hideActions ? 'invisible group-hover:visible' : ''}`}>
                    {action}
                </div>
            }
        </div>
    );
};

export default ListItem;