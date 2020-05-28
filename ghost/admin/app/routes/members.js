import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import moment from 'moment';
import {inject as service} from '@ember/service';

export default class MembersRoute extends AuthenticatedRoute {
    @service config;
    @service ellaSparse;
    @service store;

    queryParams = {
        label: {refreshModel: true},
        searchParam: {refreshModel: true, replace: true}
    };

    // redirect to posts screen if:
    // - TODO: members is disabled?
    // - logged in user isn't owner/admin
    beforeModel() {
        super.beforeModel(...arguments);
        return this.session.user.then((user) => {
            if (!user.isOwnerOrAdmin) {
                return this.transitionTo('home');
            }
        });
    }

    model(params) {
        if (!params.searchParam) {
            this.controllerFor('members').resetSearch();
        }

        // use a fixed created_at date so that subsequent pages have a consistent index
        let startDate = new Date();

        // bypass the stale data shortcut if params change
        let forceReload = params.label !== this._lastLabel || params.searchParam !== this._lastSearchParam;
        this._lastLabel = params.label;
        this._lastSearchParam = params.searchParam;

        // unless we have a forced reload, do not re-fetch the members list unless it's more than a minute old
        // keeps navigation between list->details->list snappy
        if (!forceReload && this._startDate && !(this._startDate - startDate > 1 * 60 * 1000)) {
            return this.controller.members;
        }

        this._startDate = startDate;

        return this.ellaSparse.array((range = {}, query = {}) => {
            const labelFilter = params.label ? `label:'${params.label}'+` : '';

            query = Object.assign({
                limit: range.length,
                page: range.start / range.length,
                order: 'created_at desc',
                filter: `${labelFilter}created_at:<='${moment.utc(this._startDate).format('YYYY-MM-DD HH:mm:ss')}'`,
                search: params.searchParam
            }, query);

            return this.store.query('member', query).then((result) => {
                return {
                    data: result,
                    total: result.meta.pagination.total
                };
            });
        }, {
            limit: 50
        });
    }

    // trigger a background load of members plus labels for filter dropdown
    setupController(controller) {
        super.setupController(...arguments);
        controller.fetchLabelsTask.perform();
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Members'
        };
    }
}
