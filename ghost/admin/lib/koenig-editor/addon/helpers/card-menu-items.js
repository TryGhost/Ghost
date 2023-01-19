import Helper from '@ember/component/helper';
import snippetIcon from '../utils/snippet-icon';
import {CARD_MENU} from '../options/cards';
import {get} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {isArray} from '@ember/array';
import {inject as service} from '@ember/service';

export default class CardMenuItems extends Helper {
    @service feature;
    @service settings;

    @inject config;

    compute(positional, {postType, snippets, deleteSnippet} = {}) {
        let itemSections = JSON.parse(JSON.stringify(CARD_MENU));

        itemSections = itemSections.filter((section) => {
            return !section.developerExperiment || this.config.enableDeveloperExperiments;
        });

        itemSections.forEach((section) => {
            section.items = section.items.filter((card) => {
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
            });
        });

        if (snippets?.length) {
            let snippetsSection = {
                title: 'Snippets',
                items: [],
                rowLength: 1
            };

            snippets.forEach((snippet) => {
                let snippetItem = {
                    label: snippet.name,
                    icon: snippetIcon(snippet),
                    type: 'snippet',
                    matches: query => snippet.name.toLowerCase().indexOf(query) > -1
                };
                if (deleteSnippet) {
                    snippetItem.deleteClicked = (event) => {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        deleteSnippet(snippet);
                    };
                }
                snippetsSection.items.push(snippetItem);
            });

            itemSections.push(snippetsSection);
        }

        return itemSections;
    }
}
