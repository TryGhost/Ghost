import Component from '@glimmer/component';
import RSVP, {resolve} from 'rsvp';
import {action, get} from '@ember/object';
import {defaultMatcher, filterOptions} from 'ember-power-select/utils/group-utils';
import {tracked} from '@glimmer/tracking';

export default class GhInputWithSelectComponent extends Component {
    @tracked searchEnabled = true;

    get matcher() {
        return this.args.matcher || defaultMatcher;
    }

    get valueField() {
        return this.args.valueField || 'name';
    }

    shouldShowCreateOption(term, options) {
        if (this.args.showCreate) {
            return true;
        }
        return this.args.showCreateWhen ? this.args.showCreateWhen(term, options) : false;
    }

    addCreateOption(term, results) {
        if (this.shouldShowCreateOption(term, results)) {
            if (this.args.showCreatePosition === 'bottom'){
                results.push(this.buildSuggestionForTerm(term));
            } else {
                results.unshift(this.buildSuggestionForTerm(term));
            }
        }
    }

    @action
    searchAndSuggest(term, select) {
        return RSVP.resolve(this.args.options).then((newOptions) => {
            if (term.length === 0) {
                return newOptions;
            }

            let searchAction = this.args.search;
            if (searchAction) {
                return resolve(searchAction(term, select)).then((results) => {
                    if (results.toArray) {
                        results = results.toArray();
                    }
                    this.addCreateOption(term, results);
                    return results;
                });
            }

            newOptions = this.filter(newOptions, term);
            this.addCreateOption(term, newOptions);

            return newOptions;
        });
    }

    @action
    selectOrCreate(selection, select, keyboardEvent) {
        // don't randomly select an option whilst typing in the input
        if (select && !select.isOpen) {
            return;
        }

        const value = selection.__value__ || get(selection, this.valueField);

        if (this.args.onChange) {
            return this.args.onChange(value, select, keyboardEvent);
        } else {
            return this.args.onInput(value, select, keyboardEvent);
        }
    }

    // Methods
    filter(options, searchText) {
        let matcher;
        if (this.args.searchField) {
            matcher = (option, text) => this.matcher(get(option, this.args.searchField), text);
        } else {
            matcher = (option, text) => this.matcher(option, text);
        }
        return filterOptions(options || [], searchText, matcher);
    }

    buildSuggestionForTerm(term) {
        return {
            __isSuggestion__: true,
            __value__: term,
            text: this.buildSuggestionLabel(term)
        };
    }

    buildSuggestionLabel(term) {
        if (this.args.buildSuggestion) {
            return this.args.buildSuggestion(term);
        }

        return `Create "${term}"...`;
    }
}
