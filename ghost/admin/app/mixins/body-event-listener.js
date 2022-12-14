import $ from 'jquery';
import Mixin from '@ember/object/mixin';
import {run} from '@ember/runloop';

function K() {
    return this;
}

// Code modified from Addepar/ember-widgets
// https://github.com/Addepar/ember-widgets/blob/master/src/mixins.coffee#L39

export default Mixin.create({
    bodyElementSelector: 'html',
    bodyClick: K,

    init() {
        this._super(...arguments);

        return run.next(this, this._setupDocumentHandlers);
    },

    willDestroy() {
        this._super(...arguments);

        return this._removeDocumentHandlers();
    },

    _setupDocumentHandlers() {
        if (this._clickHandler) {
            return;
        }

        this._clickHandler = event => this.bodyClick(event);

        return $(this.bodyElementSelector).on('click', this._clickHandler);
    },

    _removeDocumentHandlers() {
        $(this.bodyElementSelector).off('click', this._clickHandler);
        this._clickHandler = null;
    },

    // http://stackoverflow.com/questions/152975/how-to-detect-a-click-outside-an-element
    click(event) {
        return event.stopPropagation();
    }
});
