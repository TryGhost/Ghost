import Ember from 'ember';
import ghostPaths from 'ghost/utils/ghost-paths';

const {Service, _ProxyMixin} = Ember;

export default Service.extend(_ProxyMixin, {
    content: ghostPaths()
});
