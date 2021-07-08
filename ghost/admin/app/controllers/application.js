/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import {computed} from '@ember/object';
import {
    contrast,
    darkenToContrastThreshold,
    hexToRgb,
    lightenToContrastThreshold,
    rgbToHex
} from 'ghost-admin/utils/color';
import {inject as service} from '@ember/service';

export default Controller.extend({
    billing: service(),
    customViews: service(),
    config: service(),
    dropdown: service(),
    feature: service(),
    router: service(),
    session: service(),
    settings: service(),
    ui: service(),

    showBilling: computed.reads('config.hostSettings.billing.enabled'),
    showNavMenu: computed('router.currentRouteName', 'session.{isAuthenticated,user}', 'ui.isFullScreen', function () {
        let {router, session, ui} = this;

        // if we're in fullscreen mode don't show the nav menu
        if (ui.isFullScreen) {
            return false;
        }

        // we need to defer showing the navigation menu until the session.user
        // is populated so that gh-user-can-admin has the correct data
        if (!session.isAuthenticated || !session.user) {
            return false;
        }

        return (router.currentRouteName !== 'error404' || session.isAuthenticated)
                && !router.currentRouteName.match(/(signin|signup|setup|reset)/);
    }),

    adjustedAccentColor: computed('settings.accentColor', 'feature.nightShift', function () {
        const accentColor = this.settings.get('accentColor');
        const nightShift = this.feature.get('nightShift');
        // hardcoded background colors because
        // grabbing color from .gh-main with getComputedStyle always returns #ffffff
        const backgroundColor = nightShift ? '#151719' : '#ffffff';

        const accentRgb = hexToRgb(accentColor);
        const backgroundRgb = hexToRgb(backgroundColor);

        // WCAG contrast. 1 = lowest contrast, 21 = highest contrast
        const accentContrast = contrast(backgroundRgb, accentRgb);

        if (accentContrast > 2) {
            return accentColor;
        }

        let adjustedAccentRgb = accentRgb;

        if (nightShift) {
            adjustedAccentRgb = lightenToContrastThreshold(accentRgb, backgroundRgb, 2);
        } else {
            adjustedAccentRgb = darkenToContrastThreshold(accentRgb, backgroundRgb, 2);
        }

        return rgbToHex(adjustedAccentRgb);
    })
});
