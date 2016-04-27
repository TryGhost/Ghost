import Ember from 'ember';

export default Ember.Object.extend({
    // values entered here will act as defaults
    isActive: false,
    url: '',
    channel: '',
    icon: ':ghost:',
    username: ''
});
