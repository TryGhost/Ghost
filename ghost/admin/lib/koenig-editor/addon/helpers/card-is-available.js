import Helper from '@ember/component/helper';
import {get} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {isArray} from '@ember/array';
import {inject as service} from '@ember/service';

export default class CardIsAvailableHelper extends Helper {
    @service feature;
    @service settings;

    @inject config;

    compute([card], {postType} = {}) {
        let cardIsAvailable = true;

        if (typeof card.isAvailable === 'string') {
            cardIsAvailable = get(this, card.isAvailable);
        }

        if (isArray(card.isAvailable)) {
            cardIsAvailable = card.isAvailable.every((key) => {
                return get(this, key);
            });
        }

        if (card.developerExperiment) {
            cardIsAvailable = cardIsAvailable && this.config.enableDeveloperExperiments;
        }

        if (postType && card.postType) {
            cardIsAvailable = cardIsAvailable && card.postType === postType;
        }

        return cardIsAvailable;
    }
}
