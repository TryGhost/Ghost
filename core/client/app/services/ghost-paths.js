import Ember from 'ember';
import ghostPaths from 'ghost/utils/ghost-paths';

export default Ember.Service.extend(Ember._ProxyMixin, {
    content: ghostPaths()
});
