import AdminRoute from 'ghost-admin/routes/admin';

// The React admin owns /dashboard (a pure redirect to /analytics — the
// dashboard has been retired). Hand the URL to the react-fallback catch-all
// so the hidden Ember app parks instead of rewriting the shared URL to
// /analytics and racing React's redirect.
export default class DashboardRoute extends AdminRoute {
    async beforeModel() {
        return this.replaceWith('react-fallback', 'dashboard');
    }
}
