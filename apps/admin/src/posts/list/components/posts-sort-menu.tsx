import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger} from '@tryghost/shade/components';
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
                {/*
                    The label names the control *and* its value: a bare
                    aria-label of "Sort" would override the button text, so
                    assistive tech would never hear which sort is active.
                */}
                <Button aria-label={`Sort: ${getOrderLabel(order)}`} data-testid='posts-sort' variant='outline'>
                    {getOrderLabel(order)}
                    <LucideIcon.ChevronDown className='size-4' />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
                {/* Radio items so the active sort is announced, and visible. */}
                <DropdownMenuRadioGroup
                    value={order ?? ''}
                    onValueChange={value => {
                        onOrderChange(value || null);
                    }}
                >
                    <DropdownMenuRadioItem value=''>
                        {DEFAULT_ORDER_LABEL}
                    </DropdownMenuRadioItem>
                    {ORDER_OPTIONS.map(option => (
                        <DropdownMenuRadioItem key={option.value} value={option.value}>
                            {option.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
