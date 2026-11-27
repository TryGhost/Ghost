import { AutomationEnrollmentsResponseSchema } from '@tryghost/admin-x-framework/api/automations';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { useQuery } from '@tanstack/react-query';
import type { LabelAutomationMatch } from './use-label-automations';
import { useLabelNameAutomations } from './use-label-name-automations';

/** Excludes every recorded prior enrollment, including runs without steps. */
export function useMemberLabelAutomations({
  memberId,
  labelNames,
  enabled,
}: {
  memberId: string;
  labelNames: string[];
  enabled: boolean;
}) {
  const lookup = useLabelNameAutomations({ labels: [], labelNames, enabled });
  const fetchApi = useFetchApi();
  const needsEnrollments = enabled && !!memberId && lookup.matches.length > 0 && !lookup.isError;
  const query = useQuery({
    queryKey: ['MembersResponseType', 'automation-enrollments', memberId],
    enabled: needsEnrollments && !lookup.isLoading,
    staleTime: 0,
    retry: false,
    queryFn: async ({ signal }) => {
      try {
        const response = await fetchApi<unknown>(
          apiUrl(`/members/${memberId}/automation-enrollments/`),
          { signal, retry: false },
        );
        return AutomationEnrollmentsResponseSchema.parse(response).automation_enrollments;
      } catch (error) {
        // NY-1818 adds this endpoint; Admin can ship before its first Core rollout.
        if (error instanceof APIError && error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
  });
  const excludeEntered = (
    matches: LabelAutomationMatch[],
    enrollments: { automation_id: string }[] | null | undefined,
  ) => {
    if (!enrollments) {
      return [];
    }
    const entered = new Set(enrollments.map(({ automation_id: id }) => id));
    return matches.flatMap((match) => {
      const automations = match.automations.filter(({ id }) => !entered.has(id));
      return automations.length ? [{ ...match, automations }] : [];
    });
  };

  return {
    matches: excludeEntered(lookup.matches, query.data),
    isLoading: lookup.isLoading || (needsEnrollments && (query.isPending || query.isFetching)),
    isError: lookup.isError || (needsEnrollments && query.isError),
    check: async () => {
      const matches = await lookup.check();
      if (!memberId || matches.length === 0) {
        return [];
      }
      if (!query.isPending && !query.isFetching && !query.isError) {
        return excludeEntered(matches, query.data);
      }
      const result = await query.refetch({ throwOnError: true, cancelRefetch: false });
      return excludeEntered(matches, result.data);
    },
  };
}
