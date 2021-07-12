import Component from '@ember/component';
import calculatePosition from 'ember-basic-dropdown/utils/calculate-position';
import {and, match} from '@ember/object/computed';
import {inject as service} from '@ember/service';

export default Component.extend({
    config: service(),
    session: service(),
    router: service(),
    whatsNew: service(),
    feature: service(),

    showDropdownExtension: and('config.clientExtensions.dropdown', 'session.user.isOwnerOnly'),
    isSettingsRoute: match('router.currentRouteName', /^settings/),

    // equivalent to "left: auto; right: -20px"
    userDropdownPosition(trigger, dropdown) {
        let {horizontalPosition, verticalPosition, style} = calculatePosition(...arguments);
        let {width: dropdownWidth} = dropdown.firstElementChild.getBoundingClientRect();

        style.right += (dropdownWidth - 20);
        style['z-index'] = '1100';

        return {horizontalPosition, verticalPosition, style};
    }
});
