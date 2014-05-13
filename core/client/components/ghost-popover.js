
var GhostPopover = Ember.Component.extend({
    tagName: 'ul',
    classNames: 'ghost-popover overlay',
    classNameBindings: ['open'],
    open: false
});

export default GhostPopover;