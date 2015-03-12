import Ember from 'ember';
import GhostSelect from 'ghost/components/gh-select';

var RolesSelector = GhostSelect.extend({
    roles: Ember.computed.alias('options'),

    options: Ember.computed(function () {
        var rolesPromise = this.store.find('role', {permissions: 'assign'});

        return Ember.ArrayProxy.extend(Ember.PromiseProxyMixin)
            .create({promise: rolesPromise});
    })
});

export default RolesSelector;
