import {useActiveTheme} from '@tryghost/admin-x-framework/api/themes';

const useCustomFonts = () => {
    const activeThemes = useActiveTheme();
    const activeTheme = activeThemes.data?.themes[0];

    const supportsCustomFonts = !activeTheme?.warnings?.some(warning => warning.code === 'GS051-CUSTOM-FONTS');
    return {supportsCustomFonts, themeName: activeTheme?.name};
};

export default useCustomFonts;
