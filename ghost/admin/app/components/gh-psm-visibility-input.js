import Component from '@ember/component';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

const VISIBILITIES = [
    {label: 'Everyone', name: 'public'},
    {label: 'Free and paying members', name: 'members'},
    {label: 'Only paying members', name: 'paid'}
];

export default Component.extend({

    settings: service(),

    // public attrs
    post: null,

    selectedVisibility: computed('post.visibility', function () {
        return this.get('post.visibility') || this.settings.get('defaultContentVisibility');
    }),

    init() {
        this._super(...arguments);
        this.availableVisibilities = VISIBILITIES;
    },

    actions: {
        updateVisibility(newVisibility) {
            this.post.set('visibility', newVisibility);
        }
    }
});
