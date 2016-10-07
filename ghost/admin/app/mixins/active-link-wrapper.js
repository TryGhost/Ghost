// logic borrowed from https://github.com/alexspeller/ember-cli-active-link-wrapper/blob/master/addon/components/active-link.js
import Mixin from 'ember-metal/mixin';
import run from 'ember-runloop';
import computed from 'ember-computed';
import {A as emberA} from 'ember-array/utils';
import getOwner from 'ember-owner/get';

export default Mixin.create({

    classNameBindings: ['active'],

    childLinkViews: [],

    active: computed('childLinkViews.@each.active', function () {
        return emberA(this.get('childLinkViews')).isAny('active');
    }),

    didRender() {
        this._super(...arguments);

        run.scheduleOnce('afterRender', this, function () {
            let childLinkElements = this.$('a.ember-view');
            let applicationContainer = getOwner(this).application.__container__;
            let viewRegistry = applicationContainer.lookup('-view-registry:main');

            let childLinkViews = childLinkElements.toArray().map(
                (view) => viewRegistry[view.id]
            );

            this.set('childLinkViews', childLinkViews);
        });
    }

});
