import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default class IndexRoute extends AuthenticatedRoute {
    beforeModel() {
        super.beforeModel(...arguments);
        this.replaceWith('lexical-editor.new', 'post');
    }
}
