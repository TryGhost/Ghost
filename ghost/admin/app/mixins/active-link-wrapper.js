// logic borrowed from https://github.com/alexspeller/ember-cli-active-link-wrapper/blob/master/addon/components/active-link.js

import Ember from 'ember';

const {computed, run} = Ember;
const emberA = Ember.A;

export default Ember.Mixin.create({

    classNameBindings: ['active'],

    childLinkViews: [],

    active: computed('childLinkViews.@each.active', function () {
        return emberA(this.get('childLinkViews')).isAny('active');
    }),

    didRender() {
        this._super(...arguments);

        run.schedule('afterRender', this, function () {
            let childLinkElements = this.$('a.ember-view');

            let childLinkViews = childLinkElements.toArray().map((view) =>
                this._viewRegistry[view.id]
            );

            this.set('childLinkViews', childLinkViews);
        });
    }

});
