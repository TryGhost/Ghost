import React, { useId } from 'react';
import { GhAreaChart } from '@tryghost/shade/patterns';
import { Text } from '@tryghost/shade/primitives';
import type { AutomationEntriesChartData } from '@/automations/utils/automation-entry-stats';

export const TotalEntriesChart: React.FC<{ data: AutomationEntriesChartData }> = ({ data }) => {
  const id = useId();
  return (
    <>
      <Text className="tabular-nums" size="2xl" weight="semibold">
        {data.total}
      </Text>
      <figure aria-label="Automation entries" className="relative">
        <figcaption className="sr-only">
          Automation entries from {data.startDate} to {data.endDate}, in {data.timezone}.
        </figcaption>
        <GhAreaChart
          className="h-[180px]"
          data={data.points}
          id={id}
          range={data.range}
          showYAxisValues={false}
          yAxisRange={[0, data.max]}
        />
        {data.empty && (
          <Text
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center"
            size="sm"
            tone="secondary"
          >
            {data.allTime ? 'No entries yet' : 'No entries in this period'}
          </Text>
        )}
      </figure>
    </>
  );
};
