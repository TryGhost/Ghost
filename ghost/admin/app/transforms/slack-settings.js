/* eslint-disable camelcase */
import SlackObject from 'ghost-admin/models/slack-integration';
import Transform from 'ember-data/transform';
import {A as emberA, isArray as isEmberArray} from '@ember/array';

export default Transform.extend({
    deserialize(serialized) {
        let slackObj, settingsArray;
        try {
            settingsArray = JSON.parse(serialized) || [];
        } catch (e) {
            settingsArray = [];
        }

        slackObj = settingsArray.map(itemDetails => SlackObject.create(itemDetails));
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
