import Ember from 'ember';
import SettingsSaveMixin from 'ghost/mixins/settings-save';

const {
    computed,
    Controller,
    get,
    inject: {controller},
    set
} = Ember;

const {alias} = computed;
const emberA = Ember.A;

export default Controller.extend(SettingsSaveMixin, {
    appsController: controller('settings.apps'),
    slack: alias('appsController.slack'),

    _scratchValues: null,

    init() {
        this._super(...arguments);
        this._scratchValues = emberA();
    },

    save() {
        return this.get('appsController').save();
    },

    actions: {
        updateProperty(propKey, newValue) {
            this._scratchValues[propKey] = newValue;
        },

        saveProperty(propKey) {
            let slack = this.get('slack');
            let slackValue = get(slack, propKey);
            let scratchValue = this._scratchValues[propKey];

            if (!scratchValue || scratchValue === slackValue) {
                return;
            }

            // we're dealing with a POJO here so there's no "set", instead
            // we want to replace the whole object then save
            // TODO: it may be possible to use a custom transform that puts a
            // full ember "Slack/App" object on the settings model to remove
            // the reliance on reaching up into the parent controller
            set(slack, propKey, scratchValue);
            this.set('slack', [slack]);
            this.send('save');
        },

        toggleActiveProperty() {
            this.toggleProperty('slack.isActive');
            this.send('save');
        },

        sendTestNotification() {
            // let slack = this.get('slack');
            // let slackData = {};
            // let options;
            //
            // slackData = {
            //     channel: slack.channel,
            //     username: slack.user,
            //     'icon_emoji': ':ghost:',
            //     text: 'https://myblog.com/post12345',
            //     'unfurl_links': true
            // };
            // console.log(slackData);
            // // fill the options for https request
            // options = slack.url;
            // // options.method = 'POST';
            // // options.headers = {'Content-type': 'application/json'};
            // console.log(options);
            // return this.get('ajax').post(options, slackData).then((response) => {
            //     if (response) {
            //         console.log(response);
            //     }
            //
            //     this.get('notifications').showAlert(response);
            // }).catch((error) => {
            //     this.get('notifications').showAPIError(error, {key: 'owner.transfer'});
            // });
            //
            // slackData = JSON.stringify(slackData);
            //
            // req.write(slackData);
            // req.on('error', function (error) {
            //     errors.logError(
            //         error
            //     );
            // });
            // req.end();
            alert('TODO: Implement test notifications');
        }
    }
});
