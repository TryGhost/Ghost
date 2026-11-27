import React from 'react';
import { Link } from '@tryghost/shade/components';
import { cn } from '@tryghost/shade/utils';
import { useUpgradeRoute } from '@/settings/hooks/use-upgrade-route';
import { navigateTo } from '@/utils/navigation';

/** Where a plan doesn't include a feature, says so and offers the upgrade. */
export const UpgradeNotice: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => {
  const upgradeRoute = useUpgradeRoute();

  return (
    <div className={cn('rounded-md border border-border-default bg-muted px-4 py-2.5', className)}>
      {children}{' '}
      <Link asChild>
        <button type="button" onClick={() => navigateTo(upgradeRoute)}>
          Upgrade now
        </button>
      </Link>
    </div>
  );
};
