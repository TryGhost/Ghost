import ajax from 'ghost/utils/ajax';
import styleBody from 'ghost/mixins/style-body';
import AuthenticatedRoute from 'ghost/routes/authenticated';

var EditorRoute = AuthenticatedRoute.extend(styleBody, {
    classNames: ['editor'],

    model: function (params) {
        return ajax('/ghost/api/v0.1/posts/' + params.post_id);
    }
});

export default EditorRoute;