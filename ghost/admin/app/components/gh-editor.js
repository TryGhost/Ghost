import Component from 'ember-component';
import run from 'ember-runloop';

const {debounce} = run;

export default Component.extend({

    headerClass: '',

    _navIsClosed: false,
    _viewActionsWidth: 190,

    init() {
        this._super(...arguments);
        this._onResizeHandler = (evt) => {
            debounce(this, this._setHeaderClass, evt, 100);
        };
    },

    didInsertElement() {
        this._super(...arguments);
        window.addEventListener('resize', this._onResizeHandler);
        this._setHeaderClass();
    },

    didReceiveAttrs() {
        let navIsClosed = this.get('navIsClosed');

        if (navIsClosed !== this._navIsClosed) {
            run.scheduleOnce('afterRender', this, this._setHeaderClass);
        }

        this._navIsClosed = navIsClosed;
    },

    willDestroyElement() {
        this._super(...arguments);
        window.removeEventListener('resize', this._onResizeHandler);
    },

    _setHeaderClass() {
        let $editorInner = this.$('.gh-editor-inner');

        if ($editorInner.length > 0) {
            let boundingRect = $editorInner[0].getBoundingClientRect();
            let maxRight = window.innerWidth - this._viewActionsWidth;

            if (boundingRect.right >= maxRight) {
                this.set('headerClass', 'gh-editor-header-small');
                return;
            }
        }

        this.set('headerClass', '');
    }
});
