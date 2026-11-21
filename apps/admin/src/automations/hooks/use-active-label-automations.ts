import {
  AutomationReferencesResponseSchema,
  AutomationTriggerReferencesResponseSchema,
} from '@tryghost/admin-x-framework/api/automations';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useFeatureFlag, useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { useQuery } from '@tanstack/react-query';

export interface ActiveLabelAutomation {
  id: string;
  name: string;
  labelIds: string[];
}

/** Loads trigger references once for all label workflows, without retaining email graphs. */
export function useActiveLabelAutomations({ enabled }: { enabled: boolean }) {
  const automationsEnabled = useFeatureFlag('automations');
  const leadMagnetsEnabled = useFeatureFlag('automationsLeadMagnets');
  const fetchApi = useFetchApi();
  const shouldCheck = enabled && automationsEnabled && leadMagnetsEnabled;
  const query = useQuery({
    // Shares invalidation with automation edits, without mixing browse/detail cache shapes.
    queryKey: ['AutomationsResponseType', 'label-triggers'],
    enabled: shouldCheck,
    staleTime: 0,
    retry: false,
    queryFn: async ({ signal }) => {
      const data = await fetchApi<unknown>(apiUrl('/automations/'), { signal, retry: false });
      const response = AutomationReferencesResponseSchema.parse(data);
      // Browse returns summaries; trigger rules are only available on the read endpoint.
      const details = await Promise.all(
        response.automations
          .filter(({ status }) => status === 'active')
          .map(({ id }) =>
            fetchApi<unknown>(apiUrl(`/automations/${id}/`), {
              signal,
              retry: false,
            })
              .then((detail) => AutomationTriggerReferencesResponseSchema.parse(detail))
              .catch((error: unknown) => {
                // The automation may have been deleted after browsing.
                if (error instanceof APIError && error.response?.status === 404) {
                  return { automations: [] };
                }
                throw error;
              }),
          ),
      );
      return details
        .flatMap(({ automations }) => automations)
        .filter((automation) => automation.status === 'active')
        .map(({ id, name, trigger_rules: triggerRules }) => ({
          id,
          name,
          labelIds: triggerRules.flatMap((rule) =>
            rule.trigger_type === 'label_added' && rule.label_id ? [rule.label_id] : [],
          ),
        }));
    },
  });

  return {
    data: shouldCheck ? (query.data ?? []) : [],
    isLoading: shouldCheck && (query.isPending || query.isFetching),
    isError: shouldCheck && query.isError,
    retry: query.refetch,
  };
}
