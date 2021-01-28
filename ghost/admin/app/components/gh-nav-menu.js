import Component from '@ember/component';
import {match} from '@ember/object/computed';
import {inject as service} from '@ember/service';

export default Component.extend({
    settings: service(),
    router: service(),

    tagName: 'nav',
    classNames: ['gh-nav'],

    isSettingsRoute: match('router.currentRouteName', /^settings/)
});
