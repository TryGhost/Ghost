import { useEditUserPreferences, useUserPreferences, type NavigationPreferences } from "@/hooks/user-preferences";
import { useQuery, useMutation, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";


export const useNavigationPreferences = (): UseQueryResult<NavigationPreferences> => {
    const preferencesQuery = useUserPreferences();

    return useQuery({
        queryKey: ['navigationPreferences', preferencesQuery.data],
        queryFn: () => {
            if (!preferencesQuery.data) {
                throw new Error("Preferences not loaded");
            }
            return preferencesQuery.data.navigation;
        },
        enabled: !!preferencesQuery.data,
        staleTime: Infinity,
        cacheTime: 0,
    });
};

export const useEditNavigationPreferences = (): UseMutationResult<void, Error, Partial<NavigationPreferences>, unknown> => {
    const { mutateAsync: editPreferences } = useEditUserPreferences();

    return useMutation({
        mutationFn: async (updatedNavigationPreferences: Partial<NavigationPreferences>) => {
            await editPreferences({
                navigation: updatedNavigationPreferences,
            });
        },
    });
};

export const useNavigationExpanded = (expandedKey: keyof NavigationPreferences['expanded']): [boolean, (value: boolean) => void] => {
    const { data: navigationPreferences } = useNavigationPreferences();
    const { mutateAsync: editNavigationPreferences } = useEditNavigationPreferences();

    const expanded = navigationPreferences?.expanded[expandedKey];

    const setExpanded = (value: boolean) => {
        void editNavigationPreferences({
            expanded: {
                [expandedKey]: value
            },
        });
    };

    return [expanded ?? true, setExpanded];
};

export const useNavigationMenuVisibility = (): [boolean, (value: boolean) => void] => {
    const { data: navigationPreferences } = useNavigationPreferences();
    const { mutateAsync: editNavigationPreferences } = useEditNavigationPreferences();

    const visible = navigationPreferences?.menu.visible;

    const setVisible = (value: boolean) => {
        void editNavigationPreferences({
            menu: { visible: value },
        });
    };

    return [visible ?? true, setVisible];
};
