import $ from 'jquery';
import run from 'ember-runloop';
import LightTable from 'ember-light-table/components/light-table';

export default LightTable.extend({

    // HACK: infinite pagination was not triggering when scrolling very fast
    // as the throttle triggers before scrolling into the buffer area but
    // the scroll finishes before the throttle timeout. Adding a debounce that
    // does the same thing means that we are guaranteed a final trigger when
    // scrolling stops
    //
    // An issue has been opened upstream, this can be removed if it gets fixed
    // https://github.com/offirgolan/ember-light-table/issues/15

    _setupScrollEvents() {
        $(this.get('touchMoveContainer')).on('touchmove.light-table', run.bind(this, this._scrollHandler, '_touchmoveTimer'));
        $(this.get('scrollContainer')).on('scroll.light-table', run.bind(this, this._scrollHandler, '_scrollTimer'));
        $(this.get('scrollContainer')).on('scroll.light-table', run.bind(this, this._scrollHandler, '_scrollDebounce'));
    },

    _scrollHandler(timer) {
        this.set(timer, run.debounce(this, this._onScroll, 100));
        this.set(timer, run.throttle(this, this._onScroll, 100));
    }
});
