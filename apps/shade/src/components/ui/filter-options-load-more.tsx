import {Loader2} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {Ref} from 'react';

interface FilterOptionsLoadMoreProps {
    // Attach the infinite-scroll sentinel returned by useFilterOptionsInfiniteScroll
    sentinelRef: Ref<HTMLDivElement>;
    isLoadingMore: boolean;
    label: string;
    loadingLabel: string;
    onLoadMore: () => void;
    className?: string;
}

// Shared load-more affordance for filter option lists: a sentinel-wrapped button
// that doubles as the manual fallback when auto-loading isn't triggered.
export function FilterOptionsLoadMore({
    sentinelRef,
    isLoadingMore,
    label,
    loadingLabel,
    onLoadMore,
    className
}: Readonly<FilterOptionsLoadMoreProps>) {
    return (
        <div ref={sentinelRef} className={cn('p-1.5', className)}>
            <button
                className="flex w-full items-center justify-center rounded-xs px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                disabled={isLoadingMore}
                type="button"
                onClick={onLoadMore}
            >
                {isLoadingMore && <Loader2 className="mr-2 size-4 animate-spin" />}
                {isLoadingMore ? loadingLabel : label}
            </button>
        </div>
    );
}
