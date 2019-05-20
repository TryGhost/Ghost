import PostsRoute from './posts';

export default PostsRoute.extend({
    modelName: 'page',

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Pages'
        };
    }
});
