import CommentsFilters from './comments-filters';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { mockUseFeatureFlag } = vi.hoisted(() => ({
  mockUseFeatureFlag: vi.fn(),
}));

vi.mock('@tryghost/admin-x-framework/hooks', () => ({
  useFeatureFlag: (flag: string) => mockUseFeatureFlag(flag) as boolean,
}));

vi.mock('@/shared/filter-sources', () => ({
  useMemberValueSource: () => ({}),
  usePostResourceValueSource: () => ({}),
}));

describe('CommentsFilters', () => {
  const activeFilter = {
    id: 'body-filter',
    field: 'body',
    operator: 'contains',
    values: ['Ghost'],
  };

  it.each([
    { enabled: false, iconClass: 'lucide-funnel' },
    { enabled: true, iconClass: 'lucide-list-filter' },
  ])(
    'uses $iconClass for the header trigger when the flag is $enabled',
    ({ enabled, iconClass }) => {
      mockUseFeatureFlag.mockReturnValue(enabled);

      render(<CommentsFilters filters={[]} siteTimezone="UTC" onFiltersChange={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Filter' }).querySelector('svg')).toHaveClass(
        iconClass,
      );
      expect(mockUseFeatureFlag).toHaveBeenCalledWith('postsListReact');
    },
  );

  it.each([
    { enabled: false, iconClass: 'lucide-funnel-plus', clearClass: 'border-0' },
    { enabled: true, iconClass: 'lucide-list-filter-plus', clearClass: 'border' },
  ])(
    'uses $iconClass and $clearClass Clear styling with the flag set to $enabled',
    ({ enabled, iconClass, clearClass }) => {
      mockUseFeatureFlag.mockReturnValue(enabled);

      render(
        <CommentsFilters filters={[activeFilter]} siteTimezone="UTC" onFiltersChange={vi.fn()} />,
      );

      expect(screen.getByRole('button', { name: 'Add filter' }).querySelector('svg')).toHaveClass(
        iconClass,
      );
      if (enabled) {
        expect(screen.getByRole('button', { name: 'Add filter' })).toHaveClass(
          'border',
          'gap-0',
          '!px-3',
          'text-[0px]',
        );
        expect(screen.getByRole('button', { name: 'Add filter' })).not.toHaveClass('border-none');
      } else {
        expect(screen.getByRole('button', { name: 'Add filter' })).toHaveClass('border-none');
        expect(screen.getByRole('button', { name: 'Add filter' })).not.toHaveClass('text-[0px]');
      }
      const clearButton = screen.getByRole('button', { name: 'Clear' });
      expect(clearButton).toHaveClass(clearClass);
      if (enabled) {
        expect(clearButton.querySelector('svg')).not.toBeInTheDocument();
      } else {
        expect(clearButton.querySelector('svg')).toBeInTheDocument();
      }
    },
  );
});
