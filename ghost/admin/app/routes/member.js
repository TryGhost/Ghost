import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default AuthenticatedRoute.extend({
    // TODO: add model method to load member if not passed in

    titleToken() {
        return this.controller.get('member.name');
    }
});
