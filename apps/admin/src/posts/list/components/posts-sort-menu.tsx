import { PageHeader } from '@tryghost/shade/patterns';
import { Select, SelectContent, SelectItem, SelectValue } from '@tryghost/shade/components';
import { DEFAULT_ORDER_LABEL, ORDER_OPTIONS, getOrderLabel } from '@/posts/list/post-filter-fields';
import { LucideIcon } from '@tryghost/shade/utils';

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
export function PostsSortMenu({ order, onOrderChange }: PostsSortMenuProps) {
  return (
    <Select
      value={order || 'newest'}
      onValueChange={(value) => onOrderChange(value === 'newest' ? null : value)}
    >
      {/* Include the active order in the accessible name as well as the visible value. */}
      <PageHeader.SelectTrigger
        aria-label={`Sort: ${getOrderLabel(order)}`}
        data-testid="posts-sort"
        label="Sort"
        tooltip
      >
        <LucideIcon.ArrowUpDown className="size-4" />
        <SelectValue>{getOrderLabel(order)}</SelectValue>
      </PageHeader.SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="newest">{DEFAULT_ORDER_LABEL}</SelectItem>
        {ORDER_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
