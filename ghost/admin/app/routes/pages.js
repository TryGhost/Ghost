import {inject as service} from '@ember/service';
import PostsRoute from './posts';

export default class PagesRoute extends PostsRoute {
    @service feature;

    modelName = 'page';

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Pages',
            mainClasses: this.feature.get('memberAttribution') ? ['gh-main-fullwidth'] : null
        };
    }
}
