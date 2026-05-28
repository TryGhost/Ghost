import { DEFAULT_NAVIGATION_PREFERENCES, useEditUserPreferences, useUserPreferences, type NavigationPreferences } from "@/hooks/user-preferences";
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

export const useNavigationExpanded = (expandedKey: keyof NavigationPreferences['expanded']): [boolean, (value: boolean) => Promise<void>] => {
    const { data: navigationPreferences } = useNavigationPreferences();
    const { mutateAsync: editNavigationPreferences } = useEditNavigationPreferences();

    const expanded = navigationPreferences?.expanded[expandedKey];

    const setExpanded = async (value: boolean) => {
        return editNavigationPreferences({
            expanded: {
                ...(navigationPreferences?.expanded ?? DEFAULT_NAVIGATION_PREFERENCES.expanded),
                [expandedKey]: value
            },
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

export const useHiddenNavigationItems = (): [string[], (hiddenItems: string[]) => Promise<void>] => {
    const { data: navigationPreferences } = useNavigationPreferences();
    const { mutateAsync: editNavigationPreferences } = useEditNavigationPreferences();

    const hiddenItems = navigationPreferences?.hiddenItems ?? DEFAULT_NAVIGATION_PREFERENCES.hiddenItems;

    const setHiddenItems = async (nextHiddenItems: string[]) => {
        return editNavigationPreferences({
            hiddenItems: nextHiddenItems,
        });
    };

    return [hiddenItems, setHiddenItems];
};

export const useNavigationItemVisibility = (itemId: string): boolean => {
    const { data: navigationPreferences } = useNavigationPreferences();
    return !(navigationPreferences?.hiddenItems ?? DEFAULT_NAVIGATION_PREFERENCES.hiddenItems).includes(itemId);
};

export const useToggleNavigationItemVisibility = (): ((itemId: string, visible: boolean) => Promise<void>) => {
    const [hiddenItems, setHiddenItems] = useHiddenNavigationItems();

    return async (itemId: string, visible: boolean) => {
        const nextHiddenItems = visible
            ? hiddenItems.filter(hiddenItemId => hiddenItemId !== itemId)
            : [...hiddenItems.filter(hiddenItemId => hiddenItemId !== itemId), itemId];

        return setHiddenItems(nextHiddenItems);
    };
};
