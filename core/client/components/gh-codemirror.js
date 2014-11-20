/*global CodeMirror */

import MarkerManager from 'ghost/mixins/marker-manager';
import mobileCodeMirror from 'ghost/utils/codemirror-mobile';
import setScrollClassName from 'ghost/utils/set-scroll-classname';
import codeMirrorShortcuts from 'ghost/utils/codemirror-shortcuts';

var onChangeHandler,
    onScrollHandler,
    Codemirror;

codeMirrorShortcuts.init();

onChangeHandler = function (cm, changeObj) {
    var line,
        component = cm.component;

    // fill array with a range of numbers
    for (line = changeObj.from.line; line < changeObj.from.line + changeObj.text.length; line += 1) {
        component.checkLine.call(component, line, changeObj.origin);
    }

    // Is this a line which may have had a marker on it?
    component.checkMarkers.call(component);

    cm.component.set('value', cm.getValue());

    component.sendAction('typingPause');
};

onScrollHandler = function (cm) {
    var scrollInfo = cm.getScrollInfo(),
        component = cm.component;

    scrollInfo.codemirror = cm;

    // throttle scroll updates
    component.throttle = Ember.run.throttle(component, function () {
        this.set('scrollInfo', scrollInfo);
    }, 10);
};

Codemirror = Ember.TextArea.extend(MarkerManager, {
    focus: true,
    focusCursorAtEnd: false,

    setFocus: function () {
        if (this.get('focus')) {
            this.$().val(this.$().val()).focus();
        }
    }.on('didInsertElement'),

    didInsertElement: function () {
        Ember.run.scheduleOnce('afterRender', this, this.afterRenderEvent);
    },

    afterRenderEvent: function () {
        var self = this,
            codemirror;

        // replaces CodeMirror with TouchEditor only if we're on mobile
        mobileCodeMirror.createIfMobile();

        codemirror = this.initCodemirror();
        this.set('codemirror', codemirror);

        this.sendAction('setCodeMirror', this);

        if (this.get('focus') && this.get('focusCursorAtEnd')) {
            codemirror.execCommand('goDocEnd');
        }

        codemirror.eachLine(function initMarkers() {
            self.initMarkers.apply(self, arguments);
        });
    },

    // this needs to be placed on the 'afterRender' queue otherwise CodeMirror gets wonky
    initCodemirror: function () {
        // create codemirror
        var codemirror,
            self = this;

        codemirror = CodeMirror.fromTextArea(this.get('element'), {
            mode:           'gfm',
            tabMode:        'indent',
            tabindex:       '2',
            cursorScrollMargin: 10,
            lineWrapping:   true,
            dragDrop:       false,
            extraKeys: {
                Home:   'goLineLeft',
                End:    'goLineRight',
                'Ctrl-U': false,
                'Cmd-U': false,
                'Shift-Ctrl-U': false,
                'Shift-Cmd-U': false,
                'Ctrl-S': false,
                'Cmd-S': false,
                'Ctrl-D': false,
                'Cmd-D': false
            }
        });

        // Codemirror needs a reference to the component
        // so that codemirror originating events can propogate
        // up the ember action pipeline
        codemirror.component = this;

        // propagate changes to value property
        codemirror.on('change', onChangeHandler);

        // on scroll update scrollPosition property
        codemirror.on('scroll', onScrollHandler);

        codemirror.on('scroll', Ember.run.bind(Ember.$('.CodeMirror-scroll'), setScrollClassName, {
            target: Ember.$('.js-entry-markdown'),
            offset: 10
        }));

        codemirror.on('focus', function () {
            self.sendAction('onFocusIn');
        });

        return codemirror;
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
