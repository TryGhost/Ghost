import Ember from 'ember';
import TokenFieldInput from 'ember-cli-styleless-tokenfield/components/input-tokenfield';
import Bloodhound from 'bloodhound';

export default TokenFieldInput.extend({

    selectedTags: null, // tags array
    availableTags: null, // tags query promise

    didInsertElement: function () {
        this._setTokensFromSelectedTags();
        this._consumeAvailableTagsPromise();
        this._super();
    },

    setupEventHandlers: Ember.on('didInsertElement', function () {
        this.$().on('tokenfield:createtoken', Ember.run.bind(this, this.createToken));
        this.$().on('tokenfield:removetoken', Ember.run.bind(this, this.removeToken));
    }),

    createToken: function (event) {
        // avoid sending action on initial startup by checking for user text
        if (this._userHasEnteredText()) {
            this.attrs.addTag(event.attrs.value);
            this.$().data('bs.tokenfield').$input.val('');
            event.preventDefault();
        }
    },

    removeToken: function (event) {
        var self = this,
            // event.attrs is an array if multiple tokens are selected
            tokens = Array.isArray(event.attrs) ? event.attrs : [event.attrs];

        tokens.forEach(function (token) {
            self.attrs.removeTag(token.value);
        });

        // can't prevent default here because bootstrap-tokenfield will exit
        // before preventing the default click action which causes a redirect
        // to the blog homepage
        // event.preventDefault();
    },

    _setTokensFromSelectedTags: function () {
        var selectedTags = this.get('selectedTags'),
            tokens = selectedTags.mapBy('name'),
            tokensPromise = null;

        // there's a quirk in ember-cli-bootstrap-tokenfield where the
        // tokenfield's tokens property isn't reset unless a promise is passed
        tokensPromise = new Ember.RSVP.Promise(function (resolve) {
            resolve(tokens);
        });

        this.set('tokens', tokensPromise);
    },

    _observeSelectedTags: Ember.observer('selectedTags.[]', function () {
        this._setTokensFromSelectedTags();
    }),

    _consumeAvailableTagsPromise: function () {
        var self = this,
            availableTagsPromise = this.get('availableTags'),
            engine = null;

        if (!availableTagsPromise || typeof availableTagsPromise.then !== 'function') {
            // TODO: handle a non-promise availableTags property
            return;
        }

        engine = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            remote: {
                url: '%QUERY',
                transport: function (url, options, onSuccess, onError) {
                    // intercept the remote query and return our own promise
                    // data instead of the usual AJAX call
                    self.get('availableTags').then(function (availableTags) {
                        onSuccess(availableTags);
                    }).catch(function (error) {
                        onError(error);
                    });
                },
                filter: function (tags) {
                    var datums, selectedTokenNames = null;

                    // convert tags into typeahead-compatible structure and
                    // filter out already selected tags
                    datums = tags.map(function (tag) {
                        return {value: tag.get('name')};
                    });
                    selectedTokenNames = self.$().tokenfield('getTokens').mapBy('value');

                    return datums.reject(function (datum) {
                        return selectedTokenNames.contains(datum.value);
                    });
                }
            }
        });

        engine.initialize();

        this.set('typeahead', [{highlight: true, hint: true}, {source: engine.ttAdapter()}]);
    },

    _userHasEnteredText: function () {
        return this.$().data('bs.tokenfield') &&
            this.$().data('bs.tokenfield').$input.val() !== '';
    }
});
