import * as React from 'react';
import {cn} from '@/lib/utils';
import {MoreHorizontal} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from './dropdown-menu';

export interface PageMenuProps {
    children: React.ReactNode;
    responsive?: boolean;
    value?: string;
    onValueChange?: (value: string) => void;
    className?: string;
}

export interface PageMenuItemProps {
    value: string;
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
}

const PageMenu = React.forwardRef<HTMLDivElement, PageMenuProps>(
    ({children, responsive = false, value, onValueChange, className, ...props}, ref) => {
        const [visibleCount, setVisibleCount] = React.useState(React.Children.count(children));
        const [resizeKey, setResizeKey] = React.useState(0);
        const containerRef = React.useRef<HTMLDivElement>(null);
        const measureRef = React.useRef<HTMLDivElement>(null);

        React.useLayoutEffect(() => {
            if (!responsive || !containerRef.current || !measureRef.current) {
                setVisibleCount(React.Children.count(children));
                return;
            }

            const container = containerRef.current;
            const measureContainer = measureRef.current;
            const containerWidth = container.clientWidth;
            const dropdownWidth = 60; // Space needed for dropdown button
            const gap = 8; // Gap between items (gap-2)

            // Get all child elements from the measure container
            const items = Array.from(measureContainer.children) as HTMLElement[];
            let currentWidth = 0;
            let count = 0;

            for (let i = 0; i < items.length; i++) {
                const itemWidth = items[i].getBoundingClientRect().width;
                const gapWidth = i > 0 ? gap : 0; // Add gap for items after the first
                const newWidth = currentWidth + gapWidth + itemWidth;

                // Check if this item fits
                if (newWidth <= containerWidth) {
                    currentWidth = newWidth;
                    count += 1;
                } else {
                    // This item doesn't fit, check if we need dropdown space
                    const remainingItems = items.length - count;
                    if (remainingItems > 0) {
                        // We have remaining items, check if we need to remove the last visible item for dropdown space
                        if (currentWidth + dropdownWidth > containerWidth && count > 0) {
                            count -= 1;
                        }
                    }
                    break;
                }
            }

            setVisibleCount(count);
        }, [responsive, children, resizeKey]);

        React.useLayoutEffect(() => {
            if (!responsive || !containerRef.current) {
                return;
            }

            const resizeObserver = new ResizeObserver(() => {
                // Trigger re-calculation by updating the resize key
                setResizeKey(prev => prev + 1);
            });

            resizeObserver.observe(containerRef.current);
            return () => resizeObserver.disconnect();
        }, [responsive]);

        const childrenArray = React.Children.toArray(children);
        const visibleItems = childrenArray.slice(0, visibleCount);
        const hiddenItems = childrenArray.slice(visibleCount);
        const hasOverflow = hiddenItems.length > 0;

        // Find selected hidden item
        const selectedHiddenItem = hiddenItems.find(child => React.isValidElement(child) && child.props?.value === value
        ) as React.ReactElement | undefined;

        if (!responsive) {
            return (
                <div ref={ref} className={cn('flex items-center gap-2', className)} {...props}>
                    {children}
                </div>
            );
        }

        return (
            <>
                {/* Hidden container to measure all items */}
                <div
                    ref={measureRef}
                    aria-hidden="true"
                    className="pointer-events-none absolute flex items-center gap-2 opacity-0"
                    style={{top: -9999, left: -9999}}
                >
                    {children}
                </div>

                {/* Visible container */}
                <div
                    ref={containerRef}
                    className="flex w-full min-w-0 items-center gap-2"
                >
                    <div ref={ref} className={cn('flex items-center gap-2 min-w-0', className)} {...props}>
                        {visibleItems}
                    </div>

                    {hasOverflow && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className={cn(
                                        'inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-md flex-shrink-0',
                                        'ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                        'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                                        selectedHiddenItem && 'bg-accent text-accent-foreground'
                                    )}
                                    type="button"
                                >
                                    {selectedHiddenItem ? (
                                        <span className="max-w-[100px] truncate">
                                            {selectedHiddenItem.props.children}
                                        </span>
                                    ) : (
                                        <MoreHorizontal className="size-4" />
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {hiddenItems.map((item, index) => {
                                    if (!React.isValidElement(item) || !item.props?.value) {
                                        return null;
                                    }

                                    return (
                                        <DropdownMenuItem
                                            key={item.props.value || index}
                                            className={cn(
                                                item.props.value === value && 'bg-accent text-accent-foreground'
                                            )}
                                            onClick={() => {
                                                onValueChange?.(item.props.value);
                                                item.props.onClick?.();
                                            }}
                                        >
                                            {item.props.children}
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </>
        );
    }
);

PageMenu.displayName = 'PageMenu';

const PageMenuItem = React.forwardRef<HTMLButtonElement, PageMenuItemProps>(
    ({children, onClick, className, ...props}, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-md',
                    'ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                    className
                )}
                type="button"
                onClick={onClick}
                {...props}
            >
                {children}
            </button>
        );
    }
);

PageMenuItem.displayName = 'PageMenuItem';

export {PageMenu, PageMenuItem};
