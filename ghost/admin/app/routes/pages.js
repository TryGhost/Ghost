import PostsRoute from './posts';

export default class PagesRoute extends PostsRoute {
    modelName = 'page';

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Pages'
        };
    }
}
