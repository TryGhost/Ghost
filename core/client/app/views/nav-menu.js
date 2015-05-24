import Ember from 'ember';

export default Ember.View.extend(Ember.TargetActionSupport, {
    tagName: 'nav',
    classNames: 'gh-nav',
    classNameBindings: ['open'],
    templateName: 'nav-menu',

    open: true,
    isCollapsed: false,

    didInsertElement: function () {
        var self = this;

        // This needs to die at some point
        Ember.$('.gh-main').mouseenter(function () {
            self.send('collapseNav');
        });
    },

    iconClass: Ember.computed('isCollapsed', function () {
        var type = (this.get('isCollapsed')) ? 'maximise' : 'minimise';
        return 'icon-' + type;
    }),

    mouseEnter: function () {
        this.set('open', true);
    },

    actions: {
        toggleNav: function () {
            this.set('isCollapsed', !(this.get('isCollapsed')));
            this.set('open', false);
            this.triggerAction({
                action: 'toggleAutoNav',
                target: this.get('controller')
            });
        },
        collapseNav: function () {
            this.set('open', false);
        }
    }
});
