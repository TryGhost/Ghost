import Helper from '@ember/component/helper';
import {get} from '@ember/object';
import {inject as service} from '@ember/service';

export default class CardIsAvailableHelper extends Helper {
    @service config;
    @service feature;
    @service settings;

    compute([card], {postType} = {}) {
        let cardIsAvailable = true;

        if (typeof card.isAvailable === 'string') {
            cardIsAvailable = get(this, card.isAvailable);
        }

        if (card.developerExperiment) {
            cardIsAvailable = cardIsAvailable && this.config.get('enableDeveloperExperiments');
        }

        if (postType && card.postType) {
            cardIsAvailable = cardIsAvailable && card.postType === postType;
        }

        return cardIsAvailable;
    }
}
