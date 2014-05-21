import AuthenticatedRoute from 'ghost/routes/authenticated';
import styleBody from 'ghost/mixins/style-body';
import Post from 'ghost/models/post';

var NewRoute = AuthenticatedRoute.extend(styleBody, {
    controllerName: 'posts/post',
    classNames: ['editor'],

    renderTemplate: function () {
        this.render('editor');
    },

    model: function () {
        return Post.create();
    }
});

export default NewRoute;
