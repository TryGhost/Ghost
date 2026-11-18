import type { Label, LabelsResponseType } from '@tryghost/admin-x-framework/api/labels';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useActiveLabelAutomations,
  type ActiveLabelAutomation,
} from './use-active-label-automations';
import { matchLabelAutomations } from './use-label-automations';

/** Resolves CSV/draft names against current trigger labels, alongside any known IDs. */
export function useLabelNameAutomations({
  labels,
  labelNames,
  enabled,
}: {
  labels: Pick<Label, 'id' | 'name'>[];
  labelNames: string[];
  enabled: boolean;
}) {
  const lookup = useActiveLabelAutomations({
    enabled: enabled && (labels.length > 0 || labelNames.length > 0),
  });
  const fetchApi = useFetchApi();
  const queryClient = useQueryClient();
  const labelOptions = (ids: string[]) => ({
    // Label edits invalidate name matching without refetching automation graphs.
    queryKey: ['LabelsResponseType', 'automation-trigger-labels', ids],
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const responses = await Promise.all(
        ids.map((id) =>
          fetchApi<LabelsResponseType>(apiUrl(`/labels/${id}/`), { signal, retry: false }),
        ),
      );
      return responses.flatMap(({ labels: items }) => items);
    },
    retry: false,
  });
  const labelIds = [...new Set(lookup.data.flatMap(({ labelIds: ids }) => ids))].sort();
  const needsNames = enabled && labelNames.length > 0 && labelIds.length > 0 && !lookup.isError;
  const query = useQuery({
    ...labelOptions(labelIds),
    enabled: needsNames && !lookup.isLoading,
    staleTime: 0,
  });
  const names = new Set(labelNames.map((name) => name.trim().toLowerCase()));
  const match = ({
    automations,
    triggerLabels,
  }: {
    automations: ActiveLabelAutomation[];
    triggerLabels: Label[];
  }) =>
    matchLabelAutomations({
      labels: [
        ...new Map(
          [
            ...labels,
            ...triggerLabels.filter(({ name }) => names.has(name.trim().toLowerCase())),
          ].map((label) => [label.id, label]),
        ).values(),
      ],
      automations,
    });

  return {
    matches: match({ automations: lookup.data, triggerLabels: query.data ?? [] }),
    isLoading: lookup.isLoading || (needsNames && (query.isPending || query.isFetching)),
    isError: lookup.isError || (needsNames && query.isError),
    check: async () => {
      if (labels.length === 0 && labelNames.length === 0) {
        return [];
      }
      const automations = await lookup.check();
      const ids = [...new Set(automations.flatMap(({ labelIds: items }) => items))].sort();
      const triggerLabels =
        labelNames.length && ids.length
          ? await queryClient.fetchQuery({
              ...labelOptions(ids),
              staleTime: query.isError ? 0 : Infinity,
            })
          : [];
      return match({ automations, triggerLabels });
    },
  };
}
