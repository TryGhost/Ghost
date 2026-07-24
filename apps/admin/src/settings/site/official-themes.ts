import { officialThemes } from "@tryghost/admin-x-settings/src/data/official-themes";
import type { OfficialTheme, ThemeVariant } from "@tryghost/admin-x-settings/src/components/providers/settings-app-provider";

export type { OfficialTheme, ThemeVariant };

/**
 * Official theme catalogue helpers, shared by the gallery grid and the
 * preview screen. The data itself is the legacy package's — imported, not
 * duplicated.
 */

export function useOfficialThemes(): OfficialTheme[] {
    return officialThemes;
}

export const hasVariants = (theme: OfficialTheme) => Boolean(theme.variants && theme.variants.length > 0);

export const getAllVariants = (theme: OfficialTheme): ThemeVariant[] => {
    const variants: ThemeVariant[] = [{
        category: theme.category,
        previewUrl: theme.previewUrl,
        image: theme.image,
    }];

    if (theme.variants && theme.variants.length > 0) {
        variants.push(...theme.variants);
    }

    return variants;
};
