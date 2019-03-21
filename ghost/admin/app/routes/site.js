import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import styleBody from 'ghost-admin/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, {
    titleToken: 'Site',

    classNames: ['view-site'],

    model() {
        return (new Date()).valueOf();
    }
});
