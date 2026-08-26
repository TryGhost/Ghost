import {
  DEFAULT_NAVIGATION_PREFERENCES,
  useEditUserPreferences,
  useUserPreferences,
  type NavigationPreferences,
} from '@/hooks/user-preferences';
import { useMutation, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { useCallback } from 'react';

export const useNavigationPreferences = (): UseQueryResult<NavigationPreferences> => {
  return useUserPreferences({
    select: (data) => data.navigation,
  });
};

export const useEditNavigationPreferences = (): UseMutationResult<
  void,
  Error,
  Partial<NavigationPreferences>,
  unknown
> => {
  const { mutateAsync: editPreferences } = useEditUserPreferences();

  return useMutation({
    mutationFn: async (updatedNavigationPreferences: Partial<NavigationPreferences>) => {
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
    return editNavigationPreferences({
      expanded: {
        ...(navigationPreferences?.expanded ?? DEFAULT_NAVIGATION_PREFERENCES.expanded),
        [expandedKey]: value,
      },
    });
  };

  return [expanded ?? true, setExpanded];
};

export const useNavigationMenuVisibility = (): [boolean, (value: boolean) => Promise<void>] => {
  const { data: navigationPreferences } = useNavigationPreferences();
  const { mutateAsync: editNavigationPreferences } = useEditNavigationPreferences();

  const visible = navigationPreferences?.menu.visible;

  const setVisible = useCallback(
    (value: boolean) => editNavigationPreferences({ menu: { visible: value } }),
    [editNavigationPreferences],
  );

  return [visible ?? true, setVisible];
};
