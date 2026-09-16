import React from 'react';
import { LucideIcon, cn } from '@tryghost/shade/utils';

interface EmptyStatViewProps {
  className?: string;
}

const EmptyStatView: React.FC<EmptyStatViewProps> = ({ className }) => {
  return (
    <div
      className={cn(
        'flex h-full flex-col items-center justify-center gap-4 text-gray-700',
        className,
      )}
    >
      <div className="flex size-18 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-950">
        <LucideIcon.ChartScatter size={24} strokeWidth={1.5} />
      </div>
      No stats available for this filter.
    </div>
  );
};

export default EmptyStatView;
