import Ember from 'ember';
import ghostPaths from 'ghost-admin/utils/ghost-paths';

const {Service, _ProxyMixin} = Ember;

export default Service.extend(_ProxyMixin, {
    content: ghostPaths()
});
