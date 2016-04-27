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
            return SlackObject.create(itemDetails);
        });
        console.log(slackObj);
        return emberA(slackObj);
    },

    serialize(deserialized) {
        let settingsArray;

        if (isArray(deserialized)) {

            settingsArray = deserialized.map((item) => {
                let channel = item.get('channel').trim();
                let url = item.get('url').trim();
                let username = item.get('username').trim();
                let icon = item.get('icon').trim();
                let isActive = item.get('isActive').trim();

                return {url, channel, username, icon, isActive};
            }).compact();
        } else {
            settingsArray = [];
        }
        return JSON.stringify(settingsArray);
    }
});
