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
            [ settingsArray ] = JSON.parse(serialized) || [{}];
        } catch (e) {
            settingsArray = [{}];
        }

        slackObj = settingsArray.map((itemDetails) => {
            return SlackObject.create(itemDetails);
        });

        return emberA(slackObj);
    },

    serialize(deserialized) {
        let settingsArray;

        if (isArray(deserialized)) {
            settingsArray = deserialized.map((item) => {
                let label = item.get('label').trim();
                let url = item.get('url').trim();

                return {label, url};
            }).compact();
        } else {
            settingsArray = [];
        }

        return JSON.stringify(settingsArray);
    }
});
