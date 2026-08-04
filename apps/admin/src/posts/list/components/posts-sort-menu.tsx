import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@tryghost/shade/components';
import {DEFAULT_ORDER_LABEL, ORDER_OPTIONS, getOrderLabel} from '@/posts/list/post-filter-fields';
import {LucideIcon} from '@tryghost/shade/utils';

interface PostsSortMenuProps {
    order: string | null;
    onOrderChange: (order: string | null) => void;
}

/**
 * The sort control, separate from the filter chips.
 *
 * A sort has no operator, so "Sort is Newest first" would be a nonsense chip —
 * and `order` also feeds each status bucket's default ordering, which is data
 * plumbing rather than filtering. Ember shows it as its own dropdown too.
 *
 * "Newest first" is the *absence* of an `order` param, not a value.
 */
export function PostsSortMenu({order, onOrderChange}: PostsSortMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button aria-label='Sort' variant='outline'>
                    {getOrderLabel(order)}
                    <LucideIcon.ChevronDown className='size-4' />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
                <DropdownMenuItem onSelect={() => {
                    onOrderChange(null);
                }}>
                    {DEFAULT_ORDER_LABEL}
                </DropdownMenuItem>
                {ORDER_OPTIONS.map(option => (
                    <DropdownMenuItem
                        key={option.value}
                        onSelect={() => {
                            onOrderChange(option.value);
                        }}
                    >
                        {option.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
