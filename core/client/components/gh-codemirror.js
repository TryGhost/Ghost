/*global CodeMirror */

import MarkerManager from 'ghost/mixins/marker-manager';
import mobileCodeMirror from 'ghost/utils/codemirror-mobile';
import setScrollClassName from 'ghost/utils/set-scroll-classname';
import codeMirrorShortcuts from 'ghost/utils/codemirror-shortcuts';

codeMirrorShortcuts.init();

var onChangeHandler = function (cm, changeObj) {
    var line,
        component = cm.component,
        checkLine = _.bind(component.checkLine, component),
        checkMarkers = _.bind(component.checkMarkers, component);

    // fill array with a range of numbers
    for (line = changeObj.from.line; line < changeObj.from.line + changeObj.text.length; line += 1) {
        checkLine(line, changeObj.origin);
    }

    // Is this a line which may have had a marker on it?
    checkMarkers();

    cm.component.set('value', cm.getValue());
};

var onScrollHandler = function (cm) {
    var scrollInfo = cm.getScrollInfo(),
        component = cm.component;

    scrollInfo.codemirror = cm;

    // throttle scroll updates
    component.throttle = Ember.run.throttle(component, function () {
        this.set('scrollInfo', scrollInfo);
    }, 10);
};

var Codemirror = Ember.TextArea.extend(MarkerManager, {
    didInsertElement: function () {
        Ember.run.scheduleOnce('afterRender', this, this.afterRenderEvent);
    },

    afterRenderEvent: function () {
        var initMarkers = _.bind(this.initMarkers, this);

        // Allow tabbing behaviour when viewing on small screen (not mobile)
        $('.floatingheader').on('click', function () {
            $('.entry-markdown').toggleClass('active');
            $('.entry-preview').toggleClass('active');
        });

        // replaces CodeMirror with TouchEditor only if we're on mobile
        mobileCodeMirror.createIfMobile();

        this.initCodemirror();
        this.codemirror.eachLine(initMarkers);
        this.sendAction('setCodeMirror', this);
    },

    // this needs to be placed on the 'afterRender' queue otherwise CodeMirror gets wonky
    initCodemirror: function () {
        // create codemirror
        var codemirror = CodeMirror.fromTextArea(this.get('element'), {
            mode:           'gfm',
            tabMode:        'indent',
            tabindex:       '2',
            cursorScrollMargin: 10,
            lineWrapping:   true,
            dragDrop:       false,
            extraKeys: {
                Home:   'goLineLeft',
                End:    'goLineRight'
            }
        });

        codemirror.component = this; // save reference to this

        // propagate changes to value property
        codemirror.on('change', onChangeHandler);

        // on scroll update scrollPosition property
        codemirror.on('scroll', onScrollHandler);

        codemirror.on('scroll', Ember.run.bind(Ember.$('.CodeMirror-scroll'), setScrollClassName, {
            target: Ember.$('.entry-markdown'),
            offset: 10
        }));

        this.set('codemirror', codemirror);
    },

    disableCodeMirror: function () {
        var codemirror = this.get('codemirror');

        codemirror.setOption('readOnly', 'nocursor');
        codemirror.off('change', onChangeHandler);
    },

    enableCodeMirror: function () {
        var codemirror = this.get('codemirror');

        codemirror.setOption('readOnly', false);

        // clicking the trash button on an image dropzone causes this function to fire.
        // this line is a hack to prevent multiple event handlers from being attached.
        codemirror.off('change', onChangeHandler);

        codemirror.on('change', onChangeHandler);
    },

    removeThrottle: function () {
        Ember.run.cancel(this.throttle);
    }.on('willDestroyElement'),

    removeCodemirrorHandlers: function () {
        // not sure if this is needed.
        var codemirror = this.get('codemirror');
        codemirror.off('change', onChangeHandler);
        codemirror.off('scroll');
    }.on('willDestroyElement'),

    clearMarkerManagerMarkers: function () {
        this.clearMarkers();
    }.on('willDestroyElement')
});

export default Codemirror;
