import React from 'react';
import {Popover} from '@tryghost/admin-x-design-system';

export interface TOCItem {
    id: string;
    text: string;
    level: number;
    element?: HTMLElement;
}

interface TableOfContentsProps {
    items: TOCItem[];
    onItemClick: (id: string) => void;
}

const TableOfContents: React.FC<TableOfContentsProps> = ({items, onItemClick}) => {
    if (items.length === 0) {
        return null;
    }

    const getLineWidth = (level: number) => {
        switch (level) {
        case 1:
            return 'w-3';
        case 2:
            return 'w-2';
        default:
            return 'w-1';
        }
    };

    const getHeadingPadding = (level: number) => {
        switch (level) {
        case 1:
            return 'pl-2';
        case 2:
            return 'pl-6';
        default:
            return 'pl-10';
        }
    };

    return (
        <div className='absolute right-2 top-1/2 -translate-y-1/2 text-base'>
            <Popover
                position='center'
                side='right'
                trigger={
                    <div className='flex cursor-pointer flex-col items-end gap-2 rounded-md bg-white p-2 hover:bg-grey-75'>
                        {items.map(item => (
                            <div
                                key={item.id}
                                className={`h-[2px] rounded-sm bg-grey-400 pr-1 transition-all ${getLineWidth(item.level)}`}
                            />
                        ))}
                    </div>
                }
            >
                <div className='w-[220px] p-4'>
                    <nav className='max-h-[60vh] overflow-y-auto'>
                        {items.map(item => (
                            <button
                                key={item.id}
                                className={`block w-full cursor-pointer truncate rounded py-1 text-left text-grey-700 hover:bg-grey-75 hover:text-grey-900 ${getHeadingPadding(item.level)}`}
                                title={item.text}
                                type='button'
                                onClick={() => onItemClick(item.id)}
                            >
                                {item.text}
                            </button>
                        ))}
                    </nav>
                </div>
            </Popover>
        </div>
    );
};

export default TableOfContents;
