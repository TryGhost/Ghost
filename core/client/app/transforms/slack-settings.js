/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Ember from 'ember';
import Transform from 'ember-data/transform';
import SlackObject from 'ghost/models/slack-integration';

const {isArray} = Ember;
const emberA = Ember.A;

export default Transform.extend({
    deserialize(serialized) {
        let slackObj, settingsArray;
        try {
            settingsArray = JSON.parse(serialized) || [];
        } catch (e) {
            settingsArray = [];
        }

        slackObj = settingsArray.map((itemDetails) => {
            // sync naming between the stored object and the ember model
            itemDetails.icon = itemDetails.icon_emoji;
            delete itemDetails.icon_emoji;
            return SlackObject.create(itemDetails);
        });
        return emberA(slackObj);
    },

    serialize(deserialized) {
        let settingsArray;
        if (isArray(deserialized)) {
            settingsArray = deserialized.map((item) => {
                let channel = (item.get('channel') || '').trim();
                let url = (item.get('url') || '').trim();
                let username = (item.get('username') || '').trim();
                // icon is stored as icon_emoji on the server
                let icon_emoji = (item.get('icon') || ':ghost:').trim();
                let isActive = item.get('isActive');

                return {url, channel, username, icon_emoji, isActive};
            }).compact();
        } else {
            settingsArray = [];
        }
        return JSON.stringify(settingsArray);
    }
});
