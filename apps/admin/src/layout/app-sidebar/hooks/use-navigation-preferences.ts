import {
  useEditUserPreferences,
  useUserPreferences,
  type NavigationPreferences,
} from '@/hooks/user-preferences';
import { useMutation, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import type { DeepPartial } from '@/utils/deep-merge';

export const useNavigationPreferences = (): UseQueryResult<NavigationPreferences> => {
  return useUserPreferences({
    select: (data) => data.navigation,
  });
};

export const useEditNavigationPreferences = (): UseMutationResult<
  void,
  Error,
  DeepPartial<NavigationPreferences>,
  unknown
> => {
  const { mutateAsync: editPreferences } = useEditUserPreferences();

  return useMutation({
    mutationFn: async (updatedNavigationPreferences: DeepPartial<NavigationPreferences>) => {
      await editPreferences({
        navigation: updatedNavigationPreferences,
      });
    },
  });
};

export const useNavigationExpanded = (
  expandedKey: keyof NavigationPreferences['expanded'],
): [boolean, (value: boolean) => Promise<void>] => {
  const { data: navigationPreferences } = useNavigationPreferences();
  const { mutateAsync: editNavigationPreferences } = useEditNavigationPreferences();

  const expanded = navigationPreferences?.expanded[expandedKey];

  const setExpanded = async (value: boolean) => {
    // Send the one key that changed. Spreading this tab's other keys into
    // the payload would carry their stale values over whatever another
    // writer stored, which the merge underneath cannot undo.
    return editNavigationPreferences({
      expanded: { [expandedKey]: value },
    });
  };

  return [expanded ?? true, setExpanded];
};

export const useNavigationMenuVisibility = (): [boolean, (value: boolean) => Promise<void>] => {
  const { data: navigationPreferences } = useNavigationPreferences();
  const { mutateAsync: editNavigationPreferences } = useEditNavigationPreferences();

  const visible = navigationPreferences?.menu.visible;

  const setVisible = async (value: boolean) => {
    return editNavigationPreferences({
      menu: { visible: value },
    });
  };

  return [visible ?? true, setVisible];
};
