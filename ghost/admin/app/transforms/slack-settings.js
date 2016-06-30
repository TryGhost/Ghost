/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import {A as emberA, isEmberArray} from 'ember-array/utils';
import Transform from 'ember-data/transform';
import SlackObject from 'ghost-admin/models/slack-integration';

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
        return emberA(slackObj);
    },

    serialize(deserialized) {
        let settingsArray;
        if (isEmberArray(deserialized)) {
            settingsArray = deserialized.map((item) => {
                let url = (item.get('url') || '').trim();

                return {url};
            }).compact();
        } else {
            settingsArray = [];
        }
        return JSON.stringify(settingsArray);
    }
});
