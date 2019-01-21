/* eslint-disable camelcase */
import SlackObject from 'ghost-admin/models/slack-integration';
import Transform from 'ember-data/transform';
import {isArray as isEmberArray} from '@ember/array';
import {isEmpty} from '@ember/utils';

export default Transform.extend({
    deserialize(serialized) {
        let settingsArray;
        try {
            settingsArray = JSON.parse(serialized) || [];
        } catch (e) {
            settingsArray = [];
        }

        if (isEmpty(settingsArray)) {
            settingsArray.push({url: '', username: ''});
        }

        let slackObjs = settingsArray.map(itemDetails => SlackObject.create(itemDetails));

        return slackObjs;
    },

    serialize(deserialized) {
        let settingsArray;
        if (isEmberArray(deserialized)) {
            settingsArray = deserialized.map((item) => {
                let url = (item.get('url') || '').trim();
                let username = (item.get('username') || '').trim();
                if (url) {
                    return {url, username};
                }
            }).compact();
        } else {
            settingsArray = [];
        }
        return JSON.stringify(settingsArray);
    }
});
