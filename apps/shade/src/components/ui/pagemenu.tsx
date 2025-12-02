import * as React from 'react';
import {cn} from '@/lib/utils';
import {MoreHorizontal} from 'lucide-react';
import {Button, type ButtonProps} from './button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from './dropdown-menu';

const PageMenuContext = React.createContext<{defaultValue?: string} | null>(null);

export interface PageMenuProps {
    children: React.ReactNode;
    responsive?: boolean;
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    className?: string;
}

export interface PageMenuItemProps extends Omit<ButtonProps, 'children'> {
    value: string;
    children: React.ReactNode;
}

const PageMenu = React.forwardRef<HTMLDivElement, PageMenuProps>(
    ({children, responsive = false, value, defaultValue, onValueChange, className, ...props}, ref) => {
        const [visibleCount, setVisibleCount] = React.useState(React.Children.count(children));
        const [resizeKey, setResizeKey] = React.useState(0);
        const containerRef = React.useRef<HTMLDivElement>(null);
        const measureRef = React.useRef<HTMLDivElement>(null);

        React.useLayoutEffect(() => {
            if (!responsive || !containerRef.current || !measureRef.current) {
                setVisibleCount(React.Children.count(children));
                return;
            }

            // Use requestAnimationFrame to ensure DOM is fully rendered
            const calculateSizes = () => {
                if (!containerRef.current || !measureRef.current) {
                    return;
                }

                const container = containerRef.current;
                const measureContainer = measureRef.current;
                const containerWidth = container.clientWidth;
                const dropdownWidth = 60; // Space needed for dropdown button
                const gap = 6; // Gap between items (gap-1.5)

                // Get all child elements from the measure container
                const items = Array.from(measureContainer.children) as HTMLElement[];

                // First, check if ALL items fit without any dropdown
                let totalWidth = 0;
                for (let i = 0; i < items.length; i++) {
                    const itemWidth = items[i].getBoundingClientRect().width;
                    const gapWidth = i > 0 ? gap : 0;
                    totalWidth += gapWidth + itemWidth;
                }

                // If all items fit with some buffer space, show them all
                const safetyBuffer = 8; // Add 8px buffer for safe rendering
                if (totalWidth <= containerWidth - safetyBuffer) {
                    setVisibleCount(items.length);
                    return;
                }

                // Otherwise, calculate how many fit with dropdown space reserved
                let currentWidth = 0;
                let count = 0;

                for (let i = 0; i < items.length; i++) {
                    const itemWidth = items[i].getBoundingClientRect().width;
                    const gapWidth = i > 0 ? gap : 0;
                    const newWidth = currentWidth + gapWidth + itemWidth;

                    // Reserve space for dropdown (since we know not all items fit)
                    const totalNeededWidth = newWidth + dropdownWidth;

                    if (totalNeededWidth <= containerWidth) {
                        currentWidth = newWidth;
                        count += 1;
                    } else {
                        break;
                    }
                }

                setVisibleCount(count);
            };

            requestAnimationFrame(calculateSizes);
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
                <PageMenuContext.Provider value={{defaultValue}}>
                    <div ref={ref} className={cn('flex items-center gap-2', className)} {...props}>
                        {children}
                    </div>
                </PageMenuContext.Provider>
            );
        }

        return (
            <PageMenuContext.Provider value={{defaultValue}}>
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
                    className="flex w-full min-w-0 flex-1 items-center gap-1.5"
                >
                    <div ref={ref} className={cn('flex items-center gap-1.5 min-w-0', className)} {...props}>
                        {visibleItems}
                    </div>

                    {hasOverflow && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    className={cn(
                                        'h-[30px] flex-shrink-0 px-3 py-2',
                                        selectedHiddenItem && 'bg-accent text-accent-foreground'
                                    )}
                                    variant="ghost"
                                >
                                    {selectedHiddenItem ? (
                                        <span className="max-w-[100px] truncate">
                                            {selectedHiddenItem.props.children}
                                        </span>
                                    ) : (
                                        <MoreHorizontal className="size-6" />
                                    )}
                                </Button>
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
            </PageMenuContext.Provider>
        );
    }
);

PageMenu.displayName = 'PageMenu';

const PageMenuItem = React.forwardRef<HTMLButtonElement, PageMenuItemProps>(
    ({children, value, className, ...props}, ref) => {
        const pageMenuProps = React.useContext(PageMenuContext);
        const isActive = pageMenuProps?.defaultValue === value;

        return (
            <Button
                ref={ref}
                className={cn(
                    'relative h-[30px] rounded-md px-3 text-md font-medium text-gray-800 hover:text-foreground focus-visible:ring-0',
                    'data-[state=active]:bg-muted-foreground/15 data-[state=active]:font-semibold data-[state=active]:text-foreground dark:text-gray-500 dark:data-[state=active]:text-foreground',
                    className
                )}
                data-state={isActive ? 'active' : undefined}
                variant="ghost"
                {...props}
            >
                {children}
            </Button>
        );
    }
);

PageMenuItem.displayName = 'PageMenuItem';

export {PageMenu, PageMenuItem};
