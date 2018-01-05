/* global key */
import Component from '@ember/component';
import Ember from 'ember';
import {A} from '@ember/array';
import {
    advanceSelectableOption,
    defaultMatcher,
    filterOptions
} from 'ember-power-select/utils/group-utils';
import {computed} from '@ember/object';
import {get} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {isBlank} from '@ember/utils';
import {task} from 'ember-concurrency';

const {Handlebars} = Ember;

const BACKSPACE = 8;
const TAB = 9;

export default Component.extend({

    // public attrs
    closeOnSelect: false,
    labelField: 'name',
    matcher: defaultMatcher,
    searchField: 'name',
    tagName: '',
    triggerComponent: 'gh-token-input/trigger',

    optionsWithoutSelected: computed('options.[]', 'selected.[]', function () {
        return this.get('optionsWithoutSelectedTask').perform();
    }),

    actions: {
        handleKeydown(select, event) {
            // On backspace with empty text, remove the last token but deviate
            // from default behaviour by not updating search to match last token
            if (event.keyCode === BACKSPACE && isBlank(event.target.value)) {
                let lastSelection = select.selected[select.selected.length - 1];

                if (lastSelection) {
                    this.get('onchange')(select.selected.slice(0, -1), select);
                    select.actions.search('');
                    select.actions.open(event);
                }

                // prevent default
                return false;
            }

            // Tab should work the same as Enter if there's a highlighted option
            if (event.keyCode === TAB && !isBlank(event.target.value) && select.highlighted) {
                if (!select.selected || select.selected.indexOf(select.highlighted) === -1) {
                    select.actions.choose(select.highlighted, event);
                    return false;
                }
            }

            // fallback to default
            return true;
        },

        onfocus() {
            key.setScope('gh-token-input');

            if (this.get('onfocus')) {
                this.get('onfocus')(...arguments);
            }
        },

        onblur() {
            key.setScope('default');

            if (this.get('onblur')) {
                this.get('onblur')(...arguments);
            }
        }
    },

    optionsWithoutSelectedTask: task(function* () {
        let options = yield this.get('options');
        let selected = yield this.get('selected');
        return options.filter(o => !selected.includes(o));
    }),

    shouldShowCreateOption(term, options) {
        if (this.get('showCreateWhen')) {
            return this.get('showCreateWhen')(term, options);
        } else {
            return this.hideCreateOptionOnSameTerm(term, options);
        }
    },

    hideCreateOptionOnSameTerm(term, options) {
        let searchField = this.get('searchField');
        let existingOption = options.findBy(searchField, term);
        return !existingOption;
    },

    addCreateOption(term, options) {
        if (this.shouldShowCreateOption(term, options)) {
            options.unshift(this.buildSuggestionForTerm(term));
        }
    },

    searchAndSuggest(term, select) {
        return this.get('searchAndSuggestTask').perform(term, select);
    },

    searchAndSuggestTask: task(function* (term, select) {
        let newOptions = (yield this.get('optionsWithoutSelected')).toArray();

        if (term.length === 0) {
            return newOptions;
        }

        let searchAction = this.get('search');
        if (searchAction) {
            let results = yield searchAction(term, select);

            if (results.toArray) {
                results = results.toArray();
            }

            this.addCreateOption(term, results);
            return results;
        }

        newOptions = this.filter(A(newOptions), term);
        this.addCreateOption(term, newOptions);

        return newOptions;
    }),

    selectOrCreate(selection, select, keyboardEvent) {
        // allow tokens to be created with spaces
        if (keyboardEvent && keyboardEvent.code === 'Space') {
            select.actions.search(`${select.searchText} `);
            return;
        }

        let suggestion = selection.find(option => option.__isSuggestion__);

        if (suggestion) {
            this.get('oncreate')(suggestion.__value__, select);
        } else {
            this.get('onchange')(selection, select);
        }

        // clear select search
        select.actions.search('');
    },

    filter(options, searchText) {
        let matcher;
        if (this.get('searchField')) {
            matcher = (option, text) => this.matcher(get(option, this.get('searchField')), text);
        } else {
            matcher = (option, text) => this.matcher(option, text);
        }
        return filterOptions(options || [], searchText, matcher);
    },

    buildSuggestionForTerm(term) {
        return {
            __isSuggestion__: true,
            __value__: term,
            text: this.buildSuggestionLabel(term)
        };
    },

    buildSuggestionLabel(term) {
        let buildSuggestion = this.get('buildSuggestion');
        if (buildSuggestion) {
            return buildSuggestion(term);
        }
        return htmlSafe(`Add <strong>"${Handlebars.Utils.escapeExpression(term)}"...</strong>`);
    },

    // always select the first item in the list that isn't the "Add x" option
    defaultHighlighted(select) {
        let {results} = select;
        let option = advanceSelectableOption(results, undefined, 1);

        if (results.length > 1 && option.__isSuggestion__) {
            option = advanceSelectableOption(results, option, 1);
        }

        return option;
    }

});
