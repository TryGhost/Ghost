import {useActiveTheme} from '@tryghost/admin-x-framework/api/themes';
import {useCallback} from 'react';

const useCustomFonts = () => {
    const activeThemes = useActiveTheme();
    const activeTheme = activeThemes.data?.themes[0];
    const supportsCustomFonts = !activeTheme?.warnings?.some(warning => warning.code === 'GS051-CUSTOM-FONTS');

    const refreshActiveThemeData = useCallback(() => {
        activeThemes.refetch();
    }, [activeThemes]);

    return {supportsCustomFonts, refreshActiveThemeData};
};
export default useCustomFonts;
