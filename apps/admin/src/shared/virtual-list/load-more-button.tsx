import {Button} from '@tryghost/shade/components';

export interface LoadMoreButtonProps {
    isLoading?: boolean;
    onClick: () => void;
    /** Label shown when idle (default: "Load more"). */
    label?: string;
    /** Label shown while loading (default: "Loading more..."). */
    loadingLabel?: string;
    /** Optional class name for the wrapping container. */
    className?: string;
}

/**
 * Presentational "load more" affordance paired with `useVirtualListWindow`.
 * Wire `isLoading` to the infinite query's `isFetchingNextPage` and `onClick`
 * to the window's `loadMore`.
 */
export const LoadMoreButton = ({
    isLoading,
    onClick,
    label = 'Load more',
    loadingLabel = 'Loading more...',
    className = 'flex justify-center px-4 py-6'
}: LoadMoreButtonProps) => {
    const isButtonLoading = Boolean(isLoading);

    return (
        <div className={className}>
            <Button
                disabled={isButtonLoading}
                variant="outline"
                onClick={onClick}
            >
                {isButtonLoading ? loadingLabel : label}
            </Button>
        </div>
    );
};
