import Ember from 'ember';

// Code modified from Addepar/ember-widgets
// https://github.com/Addepar/ember-widgets/blob/master/src/mixins.coffee#L39

var BodyEventListener = Ember.Mixin.create({
    bodyElementSelector: 'html',
    bodyClick: Ember.K,

    init: function () {
        this._super();

        return Ember.run.next(this, this._setupDocumentHandlers);
    },

    willDestroy: function () {
        this._super();

        return this._removeDocumentHandlers();
    },

    _setupDocumentHandlers: function () {
        if (this._clickHandler) {
            return;
        }

        var self = this;

        this._clickHandler = function () {
            return self.bodyClick();
        };

        return $(this.get('bodyElementSelector')).on('click', this._clickHandler);
    },

    _removeDocumentHandlers: function () {
        $(this.get('bodyElementSelector')).off('click', this._clickHandler);
        this._clickHandler = null;
    },

    // http://stackoverflow.com/questions/152975/how-to-detect-a-click-outside-an-element
    click: function (event) {
        return event.stopPropagation();
    }
});

export default BodyEventListener;
