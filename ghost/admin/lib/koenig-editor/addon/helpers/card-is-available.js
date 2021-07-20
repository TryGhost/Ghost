import Helper from '@ember/component/helper';
import {get} from '@ember/object';
import {inject as service} from '@ember/service';

export default class CardIsAvailableHelper extends Helper {
    @service config;
    @service feature;

    compute([card]) {
        let cardIsAvailable = true;

        if (card.developerExperiment) {
            cardIsAvailable = this.config.get('enableDeveloperExperiments');
        }

        if (card.feature) {
            cardIsAvailable = get(this.feature, card.feature);
        }

        return cardIsAvailable;
    }
}
