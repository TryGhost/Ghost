import Ember from 'ember';
import Transform from 'ember-data/transform';
import SlackObject from 'ghost/models/slack-integration';

const {isArray} = Ember;
const emberA = Ember.A;

export default Transform.extend({
    deserialize(serialized) {
        let slackObj, settingsArray;
        console.log('slackObj');
        console.log(slackObj);
        console.log('settingsArray');
        console.log(settingsArray);
        try {
            settingsArray = JSON.parse(serialized) || [{}];
        } catch (e) {
            settingsArray = [{}];
        }

        slackObj = settingsArray.map((itemDetails) => {
            return SlackObject.create(itemDetails);
        });
        console.log('returned slackObj');
        console.log(slackObj);
        return emberA(slackObj);
    },

    serialize(deserialized) {
        let settingsArray;
        console.log('settingsArray');
        console.log(settingsArray);
        if (isArray(deserialized)) {
            settingsArray = deserialized.map((item) => {
                let channel = item.get('channel').trim();
                let url = item.get('url').trim();
                let username = item.get('username').trim();
                let iconEmoji = item.get('icon_emoji').trim();
                let isActive = item.get('isActive').trim();

                return {url, channel, username, iconEmoji, isActive};
            }).compact();
        } else {
            settingsArray = [];
        }
        console.log(JSON.stringify(settingsArray));
        return JSON.stringify(settingsArray);
    }
});
