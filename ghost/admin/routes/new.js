import styleBody from 'ghost/mixins/style-body';
import AuthenticatedRoute from 'ghost/routes/authenticated';

var NewRoute = AuthenticatedRoute.extend(styleBody, {
    classNames: ['editor'],

    renderTemplate: function () {
        this.render('editor');
    }
});

export default NewRoute;