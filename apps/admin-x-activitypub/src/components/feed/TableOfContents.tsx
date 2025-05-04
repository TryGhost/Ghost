import React, {useEffect, useState} from 'react';
import {Popover, PopoverContent, PopoverTrigger} from '@tryghost/shade';

export interface TOCItem {
    id: string;
    text: string;
    level: number;
    element?: HTMLElement;
}

interface TableOfContentsProps {
    tocItems: TOCItem[];
    iframeElement: HTMLIFrameElement | null;
    modalRef: React.RefObject<HTMLElement>;
    className?: string;
    onOpenChange?: (open: boolean) => void;
}

// Main component that handles logic
const TableOfContents: React.FC<TableOfContentsProps> = ({
    tocItems,
    iframeElement,
    modalRef,
    className = '!visible absolute inset-y-0 right-7 z-40 hidden lg:!block',
    onOpenChange
}) => {
    const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);

    const handleHeadingClick = (id: string) => {
        if (!iframeElement?.contentDocument) {
            return;
        }

        const heading = iframeElement.contentDocument.getElementById(id);
        if (heading && modalRef.current) {
            modalRef.current.scrollTo({
                top: heading.offsetTop - 20,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        if (!iframeElement?.contentDocument || tocItems.length <= 1) {
            return;
        }

        const container = modalRef.current;
        if (!container) {
            return;
        }

        const handleScroll = () => {
            const doc = iframeElement.contentDocument;
            if (!doc) {
                return;
            }

            const scrollTop = container.scrollTop;
            const buffer = 100;

            const headings = tocItems
                .map(item => doc.getElementById(item.id))
                .filter((el): el is HTMLElement => el !== null)
                .map(el => ({
                    id: el.id,
                    top: el.offsetTop
                }));

            if (!headings.length) {
                return;
            }

            const activeHeading = headings.reduce((prev, curr) => {
                return (curr.top - buffer <= scrollTop) ? curr : prev;
            });

            setActiveHeadingId(activeHeading?.id || null);
        };

        const scrollHandler = () => {
            requestAnimationFrame(handleScroll);
        };

        container.addEventListener('scroll', scrollHandler);
        handleScroll(); // Initial check

        return () => {
            container.removeEventListener('scroll', scrollHandler);
        };
    }, [iframeElement, tocItems, modalRef]);

    if (tocItems.length <= 1) {
        return null;
    }

    return (
        <div className={className}>
            <div className="sticky top-1/2 -translate-y-1/2">
                <TableOfContentsView
                    activeHeading={activeHeadingId || ''}
                    items={tocItems}
                    onItemClick={handleHeadingClick}
                    onOpenChange={onOpenChange}
                />
            </div>
        </div>
    );
};

interface TableOfContentsViewProps {
    items: TOCItem[];
    activeHeading: string;
    onItemClick: (id: string) => void;
    onOpenChange?: (open: boolean) => void;
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

const TableOfContentsView: React.FC<TableOfContentsViewProps> = ({items, activeHeading, onItemClick, onOpenChange}) => {
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
        <Popover modal={false} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <div className='absolute right-2 top-1/2 flex -translate-y-1/2 cursor-pointer flex-col items-end gap-2 rounded-md p-2 text-base hover:bg-black/[3%] dark:bg-black dark:hover:bg-gray-950'>
                    {items.map(item => (
                        <div
                            key={item.id}
                            className={`h-[2px] rounded-sm ${activeHeading === item.id ? 'bg-black dark:bg-white' : 'bg-gray-400 dark:bg-gray-700'} pr-1 transition-all ${getLineWidth(item.level)}`}
                        />
                    ))}
                </div>
            </PopoverTrigger>
            <PopoverContent
                align='center'
                className='w-[240px] p-2'
                side='left'
                onCloseAutoFocus={e => e.preventDefault()}
                onOpenAutoFocus={e => e.preventDefault()}
            >
                <nav
                    aria-label='Table of contents navigation'
                    className='max-h-[60vh] overflow-y-auto'
                    role='navigation'
                >
                    {items.map(item => (
                        <button
                            key={item.id}
                            className={`block w-full cursor-pointer rounded py-1 text-left text-sm leading-tight ${activeHeading === item.id ? 'text-black dark:text-white' : 'text-gray-700 dark:text-gray-600'} hover:bg-gray-75 hover:text-gray-900 dark:hover:bg-grey-925 dark:hover:text-white ${getHeadingPadding(item.level)}`}
                            title={item.text}
                            type='button'
                            onClick={() => onItemClick(item.id)}
                        >
                            {item.text}
                        </button>
                    ))}
                </nav>
            </PopoverContent>
        </Popover>
    );
};

export default TableOfContents;
