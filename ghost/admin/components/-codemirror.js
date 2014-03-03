/* global CodeMirror*/

var onChangeHandler = function (cm) {
    cm.component.set('value', cm.getDoc().getValue());
};

var onScrollHandler = function (cm) {
    var scrollInfo = cm.getScrollInfo(),
        percentage = scrollInfo.top / scrollInfo.height,
        component = cm.component;

    // throttle scroll updates
    component.throttle = Ember.run.throttle(component, function () {
        this.set('scrollPosition', percentage);
    }, 50);
};

var Codemirror = Ember.TextArea.extend({
    initCodemirror: function () {
        // create codemirror
        this.codemirror = CodeMirror.fromTextArea(this.get('element'), {
            lineWrapping: true
        });
        this.codemirror.component = this; // save reference to this

        // propagate changes to value property
        this.codemirror.on('change', onChangeHandler);

        // on scroll update scrollPosition property
        this.codemirror.on('scroll', onScrollHandler);
    }.on('didInsertElement'),

    removeThrottle: function () {
        Ember.run.cancel(this.throttle);
    }.on('willDestroyElement'),

    removeCodemirrorHandlers: function () {
        // not sure if this is needed.
        this.codemirror.off('change', onChangeHandler);
        this.codemirror.off('scroll', onScrollHandler);
    }.on('willDestroyElement')
});

export default Codemirror;