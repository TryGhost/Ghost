import Ember from 'ember';

export default Ember.Component.extend({
    classNames: ['gh-autonav-toggle'],

    maximise: false,

    click: function () {
        this.toggleProperty('maximise');

        this.sendAction('onClick');
    }
});
