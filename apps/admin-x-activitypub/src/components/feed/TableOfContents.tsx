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

const LINE_WIDTHS = {
    1: 'w-3',
    2: 'w-2',
    3: 'w-1'
} as const;

const HEADING_PADDINGS = {
    1: 'pl-2',
    2: 'pl-6',
    3: 'pl-10'
} as const;

const TableOfContents: React.FC<TableOfContentsProps> = ({items, onItemClick}) => {
    if (items.length === 0) {
        return null;
    }

    const getNormalizedLevel = (level: number) => {
        return Math.min(level, 3);
    };

    const getLineWidth = (level: number) => {
        return LINE_WIDTHS[getNormalizedLevel(level) as keyof typeof LINE_WIDTHS];
    };

    const getHeadingPadding = (level: number) => {
        return HEADING_PADDINGS[getNormalizedLevel(level) as keyof typeof HEADING_PADDINGS];
    };

    return (
        <div className='absolute right-2 top-1/2 -translate-y-1/2 text-base'>
            <Popover
                aria-label='Table of Contents'
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
                    <nav
                        aria-label='Table of contents navigation'
                        className='max-h-[60vh] overflow-y-auto'
                        role='navigation'
                    >
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
