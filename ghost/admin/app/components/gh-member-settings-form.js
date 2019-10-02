/* global key */
import Component from '@ember/component';
import Ember from 'ember';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';

const {Handlebars} = Ember;

export default Component.extend({
    feature: service(),
    config: service(),
    mediaQueries: service(),

    member: null,

    isViewingSubview: false,

    // Allowed actions
    setProperty: () => {},
    showDeleteTagModal: () => {},

    scratchName: boundOneWay('member.name'),
    scratchEmail: boundOneWay('member.email'),
    scratchDescription: '',

    actions: {
        setProperty(property, value) {
            this.setProperty(property, value);
        },

        deleteTag() {
            this.showDeleteTagModal();
        }
    }

});
