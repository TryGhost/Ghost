// logic borrowed from https://github.com/alexspeller/ember-cli-active-link-wrapper/blob/master/addon/components/active-link.js
import Mixin from 'ember-metal/mixin';
import run from 'ember-runloop';
import computed from 'ember-computed';
import {A as emberA} from 'ember-array/utils';

export default Mixin.create({

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
