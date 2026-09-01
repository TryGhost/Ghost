import MembersFilters from './members-filters';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { mockUseFeatureFlag } = vi.hoisted(() => ({
  mockUseFeatureFlag: vi.fn(),
}));

vi.mock('@tryghost/admin-x-framework/hooks', () => ({
  useFeatureFlag: (flag: string) => mockUseFeatureFlag(flag) as boolean,
}));

vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
  useBrowseSettings: () => ({ data: { settings: [] } }),
  useEmailTrackClicks: () => false,
  useEmailTrackOpens: () => false,
  useMembersTrackSources: () => false,
  useNewslettersEnabled: () => false,
  usePaidMembersEnabled: () => false,
}));

vi.mock('@tryghost/admin-x-framework/api/newsletters', () => ({
  useBrowseNewsletters: () => ({ data: { newsletters: [] } }),
}));

vi.mock('@tryghost/admin-x-framework/api/offers', () => ({
  useBrowseOffers: () => ({ data: { offers: [] } }),
}));

vi.mock('@/shared/member-custom-fields/use-definitions', () => ({
  useCustomFieldDefinitionsIncludingArchived: () => ({ data: { members_custom_fields: [] } }),
}));

vi.mock('@/shared/filter-sources', () => ({
  useEmailPostValueSource: () => ({}),
  useLabelValueSource: () => ({}),
  usePostResourceValueSource: () => ({}),
  useTierValueSource: () => ({ valueSource: {}, hasMultipleTiers: false }),
}));

vi.mock('@/members/use-member-filter-fields', () => ({
  buildOfferOptions: () => [],
  fromOfferFilterDisplayValues: (values: string[]) => values,
  toOfferFilterDisplayValues: (values: string[]) => values,
  useMemberFilterFields: () => [
    {
      key: 'name',
      label: 'Name',
      type: 'text',
      operators: [{ label: 'contains', value: 'contains' }],
    },
  ],
}));

describe('MembersFilters', () => {
  const activeFilter = {
    id: 'name-filter',
    field: 'name',
    operator: 'contains',
    values: ['Ghost'],
  };

  const renderFilters = (filters = [] as (typeof activeFilter)[]) =>
    render(
      <MembersFilters
        filters={filters}
        multipleActiveSubscriptionsCount={0}
        onFiltersChange={vi.fn()}
      />,
    );

  it.each([
    { enabled: false, iconClass: 'lucide-funnel' },
    { enabled: true, iconClass: 'lucide-list-filter' },
  ])(
    'uses $iconClass for the header trigger when the flag is $enabled',
    ({ enabled, iconClass }) => {
      mockUseFeatureFlag.mockReturnValue(enabled);

      renderFilters();

      expect(screen.getByRole('button', { name: 'Filter' }).querySelector('svg')).toHaveClass(
        iconClass,
      );
      expect(mockUseFeatureFlag).toHaveBeenCalledWith('postsListReact');
    },
  );

  it.each([
    { enabled: false, iconClass: 'lucide-funnel-plus', outlined: false },
    { enabled: true, iconClass: 'lucide-list-filter-plus', outlined: true },
  ])(
    'uses $iconClass and outlined=$outlined Clear styling with the flag set to $enabled',
    ({ enabled, iconClass, outlined }) => {
      mockUseFeatureFlag.mockReturnValue(enabled);

      renderFilters([activeFilter]);

      expect(screen.getByRole('button', { name: 'Add filter' }).querySelector('svg')).toHaveClass(
        iconClass,
      );
      if (outlined) {
        expect(screen.getByRole('button', { name: 'Clear' })).toHaveClass('border');
        expect(screen.getByRole('button', { name: 'Clear' })).not.toHaveClass('!px-0');
      } else {
        expect(screen.getByRole('button', { name: 'Clear' })).not.toHaveClass('border');
        expect(screen.getByRole('button', { name: 'Clear' })).toHaveClass('!px-0');
      }
    },
  );

  it('keeps the Save view trigger outlined with the consolidated UI enabled', () => {
    mockUseFeatureFlag.mockReturnValue(true);

    render(
      <MembersFilters
        filters={[activeFilter]}
        multipleActiveSubscriptionsCount={0}
        nql="name:~'Ghost'"
        onFiltersChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Save view' })).toHaveClass('border');
  });
});
