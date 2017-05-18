import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import styleBody from 'ghost-admin/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, {
    titleToken: 'Settings - Apps - AMP',

    classNames: ['settings-view-apps-amp'],

    actions: {
        save() {
            this.get('controller').send('save');
        }
    }

});
