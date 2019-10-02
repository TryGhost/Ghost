import Component from '@ember/component';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import {inject as service} from '@ember/service';

export default Component.extend({
    feature: service(),
    config: service(),
    mediaQueries: service(),

    isViewingSubview: false,

    scratchDescription: '',

    // Allowed actions
    setProperty: () => {},
    showDeleteTagModal: () => {},

    scratchName: boundOneWay('member.name'),
    scratchEmail: boundOneWay('member.email'),
    actions: {
        setProperty(property, value) {
            this.setProperty(property, value);
        },

        deleteTag() {
            this.showDeleteTagModal();
        }
    }

});
