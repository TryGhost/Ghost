import styleBody from 'ghost/mixins/style-body';
import AuthenticatedRoute from 'ghost/routes/authenticated';

var EditorRoute = AuthenticatedRoute.extend(styleBody, {
    classNames: ['editor'],
    controllerName: 'posts.post',
    model: function (params) {
        var post = this.store.getById('post', params.post_id);

        if (post) {
            return post;
        }

        return this.store.filter('post', { status: 'all' }, function (post) {
            return post.get('id') === params.post_id;
        }).then(function (records) {
            return records.get('firstObject');
        });
    }
});

export default EditorRoute;
