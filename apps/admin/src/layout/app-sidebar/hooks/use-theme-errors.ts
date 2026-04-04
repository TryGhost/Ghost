import {useActiveTheme} from '@tryghost/admin-x-framework/api/themes';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {isContributorUser} from '@tryghost/admin-x-framework/api/users';
import type {ThemeProblem} from '@tryghost/admin-x-framework/api/themes';

// This error is handled inline next to the related setting in the design
// customization panel rather than shown in the sidebar error banner
function isFilteredError(error: ThemeProblem<'error'>): boolean {
    return error.code === 'GS110-NO-MISSING-PAGE-BUILDER-USAGE'
        && !!error.failures?.[0]?.message?.includes('show_title_and_feature_image');
}

export function useActiveThemeErrors() {
    const {data: currentUser} = useCurrentUser();
    const isContributor = currentUser && isContributorUser(currentUser);

    const {data: activeThemeData} = useActiveTheme({
        enabled: !isContributor
    });

    const activeTheme = activeThemeData?.themes?.[0];
    const allErrors = activeTheme?.errors ?? [];
    const warnings = activeTheme?.warnings ?? [];

    const errors = allErrors.filter(error => !isFilteredError(error));
    const hasErrors = errors.length > 0;

    return {hasErrors, errors, warnings};
}
