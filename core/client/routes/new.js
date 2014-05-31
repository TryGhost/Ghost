import AuthenticatedRoute from 'ghost/routes/authenticated';
import styleBody from 'ghost/mixins/style-body';

var NewRoute = AuthenticatedRoute.extend(styleBody, {
    controllerName: 'posts.post',
    classNames: ['editor'],

    renderTemplate: function () {
        this.render('editor');
    },

    model: function () {
        return this.store.createRecord('post', {
            title: ''
        });
    }
});

export default NewRoute;
