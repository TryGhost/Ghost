import styleBody from 'ghost/mixins/style-body';
import AuthenticatedRoute from 'ghost/routes/authenticated';

var EditorRoute = AuthenticatedRoute.extend(styleBody, {
    classNames: ['editor'],
    controllerName: 'posts.post',
    model: function (params) {
        return this.store.find('post', params.post_id);
    }
});

export default EditorRoute;
