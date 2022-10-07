import PostsRoute from './posts';
import {inject as service} from '@ember/service';

export default class PagesRoute extends PostsRoute {
    @service feature;

    modelName = 'page';

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Pages'
        };
    }
}
