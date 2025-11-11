import { DEFAULT_NAVIGATION_PREFERENCES, useEditUserPreferences, useUserPreferences, type NavigationPreferences } from "@/hooks/user-preferences";
import { useQuery, useMutation, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";


export const useNavigationPreferences = (): UseQueryResult<NavigationPreferences> => {
    const preferencesQuery = useUserPreferences();

    return useQuery({
        queryKey: ['navigationPreferences', preferencesQuery.data],
        queryFn: () => {
            if (!preferencesQuery.data) {
                throw new Error("Preferences not loaded");
            }
            return preferencesQuery.data.navigation ?? DEFAULT_NAVIGATION_PREFERENCES;
        },
        enabled: !!preferencesQuery.data,
        staleTime: Infinity,
        cacheTime: 0,
    });
};

export const useEditNavigationPreferences = (): UseMutationResult<void, Error, Partial<NavigationPreferences>, unknown> => {
    const { data: preferences } = useUserPreferences();
    const { mutateAsync: editPreferences } = useEditUserPreferences();

    return useMutation({
        mutationFn: async (updatedNavigationPreferences: Partial<NavigationPreferences>) => {
            const currentNavigation = preferences?.navigation ?? DEFAULT_NAVIGATION_PREFERENCES;

            const newNavigationPreferences: NavigationPreferences = {
                ...currentNavigation,
                ...updatedNavigationPreferences,
            };

            await editPreferences({
                navigation: newNavigationPreferences,
            });
        },
    });
};
