import NavigationItem from 'ghost-admin/models/navigation-item';
import {A as emberA} from '@ember/array';
import {getPageNavigationPlacement, pagePathForSlug, updatePageNavigation} from '@tryghost/admin-x-framework/helpers';

export {pagePathForSlug};

function itemsFor(settings, key) {
    return (settings[key]?.toArray() ?? []).map(({label, url, icon, visibility}) => ({label, url, icon, visibility}));
}

export function getPagePlacement(settings, path, blogUrl, pageRoutes) {
    return getPageNavigationPlacement(itemsFor(settings, 'navigation'), itemsFor(settings, 'secondaryNavigation'), path, blogUrl, pageRoutes);
}

export async function setPageNavigationPlacement(settings, {label, path, placement, blogUrl, pageRoutes}) {
    await settings.reload();
    const result = updatePageNavigation(itemsFor(settings, 'navigation'), itemsFor(settings, 'secondaryNavigation'), [{label, path}], placement, blogUrl, pageRoutes);
    if (!result.changed) {
        return placement;
    }

    const previousPrimary = settings.navigation;
    const previousSecondary = settings.secondaryNavigation;
    try {
        settings.navigation = emberA(result.navigation.map(item => NavigationItem.create({...item, isSecondary: false})));
        settings.secondaryNavigation = emberA(result.secondaryNavigation.map(item => NavigationItem.create({...item, isSecondary: true})));
        await settings.save();
        return placement;
    } catch (error) {
        if (settings.settingsModel) {
            settings.navigation = previousPrimary;
            settings.secondaryNavigation = previousSecondary;
        }
        throw error;
    }
}
