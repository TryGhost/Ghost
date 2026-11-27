import { useReadAutomation } from '@tryghost/admin-x-framework/api/automations';

export const useAutomationForEditing = (id: string | null) => {
  const { data, isError, isFetchedAfterMount } = useReadAutomation(id ?? '', {
    enabled: id !== null,
    defaultErrorHandler: false,
    refetchOnMount: 'always',
  });
  const fetchedAutomation = data?.automations[0];
  const automation =
    isFetchedAfterMount && !isError && fetchedAutomation?.id === id ? fetchedAutomation : undefined;

  return {
    automation,
    isError,
  };
};
