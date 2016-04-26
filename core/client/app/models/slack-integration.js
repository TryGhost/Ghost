import Ember from 'ember';

export default Ember.Object.extend({
    // values entered here will act as defaults
    isActive: false,
    url: '/',
    channel: '#general',
    icon: ':ghost:',
    username: 'ghost_bot'
});
