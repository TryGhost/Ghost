import React from 'react';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { NoValueLabel, NoValueLabelIcon } from '@tryghost/shade/components';
import { type Tier } from '@tryghost/admin-x-framework/api/tiers';
import { TrialDaysLabel } from './tier-detail-preview';
import { currencyToDecimal, getSymbol } from '@tryghost/admin-x-framework';
import { formatNumber } from '@tryghost/shade/utils';
import { useSettingsNavigation } from '@/settings/hooks/use-settings-navigation';
import { useSettingsGroupedNav } from '@/settings/hooks/use-settings-groups';

interface TiersListProps {
  tab?: 'active-tiers' | 'archive-tiers' | 'free-tier';
  tiers: Tier[];
}

interface TierCardProps {
  tier: Tier;
}

/** Grey tiles on a white card, or white tiles on the grouped navigation's grey card. */
const cardContainerClasses = (grouped: boolean) =>
  cn(
    'group/tiercard flex cursor-pointer flex-col items-start justify-between gap-4 self-stretch rounded-sm border p-4 transition-all hover:shadow-sm min-[900px]:min-h-[200px]',
    grouped
      ? 'border-border-default bg-card'
      : 'border-transparent bg-muted hover:border-border-default hover:bg-interactive-hover',
  );

const TierCard: React.FC<TierCardProps> = ({ tier }) => {
  const { updateRoute } = useSettingsNavigation();
  const grouped = useSettingsGroupedNav();
  const currency = tier?.currency || 'USD';
  const currencySymbol = currency ? getSymbol(currency) : '$';

  return (
    <div className={cardContainerClasses(grouped)} data-testid="tier-card" data-tier={tier.slug}>
      <div
        className="w-full grow"
        onClick={() => {
          updateRoute({ route: `tiers/${tier.id}` });
        }}
      >
        <div className="text-[1.65rem] leading-tight font-bold tracking-tight text-black in-data-[admin7-design=true]:font-title dark:text-white">
          {tier.name}
        </div>
        <div className="mt-2 flex items-baseline">
          <span className="ml-1 translate-y-[-3px] text-md font-bold uppercase">
            {currencySymbol}
          </span>
          <span className="text-xl font-bold tracking-tighter">
            {formatNumber(currencyToDecimal(tier.monthly_price || 0), { maximumFractionDigits: 2 })}
          </span>
          {tier.monthly_price && tier.monthly_price > 0 && (
            <span className="text-gray-700">/month</span>
          )}
        </div>
        {tier.trial_days ? (
          <div className="mt-1 mb-4">
            <TrialDaysLabel size="sm" trialDays={tier.trial_days} />
          </div>
        ) : (
          ''
        )}
        <div className="mt-2 line-clamp-2 text-[1.4rem] font-medium">
          {tier.description || <span className="opacity-30">No description</span>}
        </div>
      </div>
    </div>
  );
};

const TiersList: React.FC<TiersListProps> = ({ tab, tiers }) => {
  const { updateRoute } = useSettingsNavigation();
  const grouped = useSettingsGroupedNav();
  const openTierModal = () => {
    updateRoute('tiers/add');
  };

  if (!tiers.length) {
    return (
      <NoValueLabel>
        <NoValueLabelIcon>
          <LucideIcon.Banknote />
        </NoValueLabelIcon>
        No {tab === 'active-tiers' ? 'active' : 'archived'} tiers found.
      </NoValueLabel>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 min-[900px]:grid-cols-3">
      {tiers.map((tier) => {
        return <TierCard key={tier.id} tier={tier} />;
      })}
      {tab === 'active-tiers' && (
        <button
          className={`${cardContainerClasses(grouped)} group cursor-pointer`}
          type="button"
          onClick={() => {
            openTierModal();
          }}
        >
          <div className="flex size-full flex-col items-center justify-center">
            <div className="flex flex-col items-center justify-center">
              <div className="translate-y-[15px] transition-all group-hover:translate-y-0">
                <LucideIcon.Plus className="size-5 text-green" />
              </div>
              <div className="mt-2 translate-y-[-10px] font-semibold text-green opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                Add tier
              </div>
            </div>
          </div>
        </button>
      )}
    </div>
  );
};

export default TiersList;
