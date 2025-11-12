import { useEditUserPreferences, useUserPreferences, type NavigationPreferences } from "@/hooks/user-preferences";
import { useMutation, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";


export const useNavigationPreferences = (): UseQueryResult<NavigationPreferences> => {
    return useUserPreferences({
        select: (data) => data.navigation,
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
        return editNavigationPreferences({
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
        return editNavigationPreferences({
            menu: { visible: value },
        });
    };

    return [visible ?? true, setVisible];
};
