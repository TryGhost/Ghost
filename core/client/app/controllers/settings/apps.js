import Ember from 'ember';
import SettingsSaveMixin from 'ghost/mixins/settings-save';

const {
    Controller,
    computed,
    inject: {controller, service}
} = Ember;
const {alias} = computed;

export default Controller.extend(SettingsSaveMixin, {
    slackController: controller('settings.apps.slack'),
    newSlackObject: alias('slackController.newSlackObject'),
    ajax: service(),

    slack: computed('model.slack', function () {
        let slackItem;

        try {
            [ slackItem ] = JSON.parse(this.get('model.slack')) || [{}];
        } catch (e) {
            slackItem = [{}];
        }

        return slackItem;
    }),

    isActive: computed('slack', function () {
        let slack = this.get('slack');
        return slack.isActive;
    }),

    save() {
        let newValues = [];
        let notifications = this.get('notifications');

        newValues.push(this.get('newSlackObject'));

        this.set('model.slack', JSON.stringify(newValues));
        this.get('model').notifyPropertyChange('slack');

        return this.get('model').save().catch((err) => {
            notifications.showErrors(err);
        });
    },
    actions: {
        sendTestMail() {
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
        }
    }

});
