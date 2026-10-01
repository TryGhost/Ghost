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
      <figure aria-label="Automation entries">
        <figcaption className="sr-only">
          Automation entries from {data.startDate} to {data.endDate}, in {data.timezone}.
        </figcaption>
        <GhAreaChart
          className="h-[180px]"
          data={data.points}
          id={id}
          range={data.range}
          showHours={data.showHours}
          showYAxisValues={false}
          yAxisRange={[0, data.max]}
        />
      </figure>
    </>
  );
};
