import Ember from 'ember';

const {$, run} = Ember;

export default Ember.Service.extend({

    _leftPaneElement: null,
    _rightPaneElement: null,

    _isScrollingOnLeft: false,
    _isScrollingOnRight: false,

    registerLeftPane(element) {
        this._leftPaneElement = element;
        $(this._leftPaneElement).on('scroll', run.bind(this, this._leftPaneScrollHandler));
    },

    teardownLeftPane() {
        $(this._leftPaneElement).off('scroll');
        this._leftPaneElement = null;
    },

    registerRightPane(element) {
        this._rightPaneElement = element;
        $(this._rightPaneElement).on('scroll', run.bind(this, this._rightPaneScrollHandler));
    },

    teardownRightPane() {
        $(this._rightPaneElement).off('scroll');
        this._rightPaneElement = null;
    },

    _syncPanes(scrolledPane, syncPane) {
        if (!scrolledPane || !syncPane) {
            return;
        }

        let height = scrolledPane.scrollHeight - scrolledPane.clientHeight;
        let ratio = parseFloat(scrolledPane.scrollTop) / height;
        let newScrollTop = (syncPane.scrollHeight - syncPane.clientHeight) * ratio;

        syncPane.scrollTop = newScrollTop;
    },

    _leftPaneScrollHandler() {
        run.throttle(this, () => {
            this._leftPaneScrolled();
        }, 10);
    },

    _rightPaneScrollHandler() {
        run.throttle(this, () => {
            this._rightPaneScrolled();
        }, 10);
    },

    // syncs scroll left -> right
    _leftPaneScrolled() {
        if (this._isScrollingOnRight) {
            this._isScrollingOnRight = false;
            return;
        }

        this._isScrollingOnLeft = true;

        this._syncPanes(this._leftPaneElement, this._rightPaneElement);
    },

    // syncs scroll left <- right
    _rightPaneScrolled() {
        if (this._isScrollingOnLeft) {
            this._isScrollingOnLeft = false;
            return;
        }

        this._isScrollingOnRight = true;

        this._syncPanes(this._rightPaneElement, this._leftPaneElement);
    }

});
