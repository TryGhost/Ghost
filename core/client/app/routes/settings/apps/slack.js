/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import AuthenticatedRoute from 'ghost/routes/authenticated';
import NotFoundHandler from 'ghost/mixins/404-handler';
import Ember from 'ember';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {
    computed,
    isBlank
} = Ember;
// const {Errors} = DS;
// const emberA = Ember.A;

export const Slack = Ember.Object.extend(ValidationEngine, {
    url: '',
    channel: '',
    username: '',
    icon_emoji: ':ghost:',
    isActive: false,

    validationType: 'settings',

    // isComplete: computed('channel', 'url', 'username', function () {
    //     let {channel, url, username} = this.getProperties('channel', 'url', 'username');
    //
    //     return !isBlank(channel) && !isBlank(url) && !isBlank(username);
    // }),
    //
    // isBlank: computed('channel', 'url', 'username', function () {
    //     let {channel, url, username} = this.getProperties('channel', 'url', 'username');
    //
    //     return isBlank(channel) && isBlank(url) && isBlank(username);
    // }),

    init() {
        this._super(...arguments);
        // this.set('errors', Errors.create());
        // this.set('hasValidated', emberA());
    }
});

export default AuthenticatedRoute.extend(NotFoundHandler, {

    model() {
        let slackObj = Slack.create(
                    {
                        isActive: false,
                        url: '/',
                        channel: '',
                        icon_emoji: ':ghost:',
                        username: ''
                    });
        return slackObj;
    }
});
