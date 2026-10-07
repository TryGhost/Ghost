import { useReadAutomation } from '@tryghost/admin-x-framework/api/automations';

export const useAutomationForEditing = (id: string) => {
  const { data, isError, isFetchedAfterMount } = useReadAutomation(id, {
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
