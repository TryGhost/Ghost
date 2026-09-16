import CustomViewFormModal from '../components/modals/custom-view-form';
import EmberObject, {action} from '@ember/object';
import Service, {inject as service} from '@ember/service';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {isArray} from '@ember/array';
import {task} from 'ember-concurrency';

const VIEW_COLORS = [
    'midgrey',
    'blue',
    'green',
    'red',
    'teal',
    'purple',
    'yellow',
    'orange',
    'pink'
];

const CustomView = EmberObject.extend(ValidationEngine, {
    validationType: 'customView',

    name: '',
    route: '',
    color: '',
    filter: null,
    isNew: false,
    isDefault: false,

    init() {
        this._super(...arguments);
        if (!this.filter) {
            this.filter = {};
        }
        if (!this.color) {
            this.color = VIEW_COLORS[Math.floor(Math.random() * VIEW_COLORS.length)];
        }
    },

    // convert to POJO so we don't store any client-specific objects in any
    // stringified JSON settings fields
    toJSON() {
        return {
            name: this.name,
            route: this.route,
            color: this.color,
            filter: this.filter
        };
    }
});

const DEFAULT_VIEWS = [{
    route: 'posts',
    name: 'Drafts',
    color: 'midgrey',
    icon: 'pen',
    filter: {
        type: 'draft'
    }
}, {
    route: 'posts',
    name: 'Scheduled',
    color: 'midgrey',
    icon: 'clock',
    filter: {
        type: 'scheduled'
    }
}, {
    route: 'posts',
    name: 'Published',
    color: 'midgray',
    icon: 'published-post',
    filter: {
        type: 'published'
    }
}].map((view) => {
    return CustomView.create(Object.assign({}, view, {isDefault: true}));
});

let isFilterEqual = function (filterA, filterB) {
    let aProps = Object.getOwnPropertyNames(filterA);
    let bProps = Object.getOwnPropertyNames(filterB);

    if (aProps.length !== bProps.length) {
        return false;
    }

    for (let i = 0; i < aProps.length; i++) {
        let key = aProps[i];
        if (filterA[key] !== filterB[key]) {
            return false;
        }
    }

    return true;
};

let isViewEqual = function (viewA, viewB) {
    return viewA.route === viewB.route
        && isFilterEqual(viewA.filter, viewB.filter);
};

export default class CustomViewsService extends Service {
    @service modals;
    @service router;
    @service session;
    @service settings;

    get viewList() {
        let {settings, session} = this;

        // avoid fetching user before authenticated otherwise the 403 can fire
        // during authentication and cause errors during setup/signin
        if (!session.isAuthenticated || !session.user) {
            return [];
        }

        let views = JSON.parse(settings.sharedViews || '[]');
        views = isArray(views) ? views : [];

        const viewList = [];

        // contributors can only see their own draft posts so it doesn't make
        // sense to show them default views which change the status/type filter
        if (!session.user.isContributor) {
            viewList.push(...DEFAULT_VIEWS);
        }

        viewList.push(...views.map((view) => {
            return CustomView.create(view);
        }));

        return viewList;
    }

    @task
    *saveViewTask(view) {
        yield view.validate();

        const {viewList} = this;

        // perform some ad-hoc validation of duplicate names because ValidationEngine doesn't support it
        let duplicateView = viewList.find((existingView) => {
            return existingView.route === view.route
                && existingView.name.trim().toLowerCase() === view.name.trim().toLowerCase()
                && !isFilterEqual(existingView.filter, view.filter);
        });
        if (duplicateView) {
            view.errors.add('name', 'Has already been used');
            view.hasValidated.pushObject('name');
            view.invalidate();
            return false;
        }

        // remove an older version of the view from our views list
        // - we don't allow editing the filter and route+filter combos are unique
        // - we create a new instance of a view from an existing one when editing to act as a "scratch" view
        let matchingView = viewList.find(existingView => isViewEqual(existingView, view));
        if (matchingView) {
            viewList.replace(viewList.indexOf(matchingView), 1, [view]);
        } else {
            viewList.push(view);
        }

        // rebuild the "views" array in our user settings json string
        yield this._saveViewSettings(viewList);

        view.set('isNew', false);
        return view;
    }

    @task
    *deleteViewTask(view) {
        const {viewList} = this;
        let matchingView = viewList.find(existingView => isViewEqual(existingView, view));
        if (matchingView && !matchingView.isDefault) {
            viewList.removeObject(matchingView);
            yield this._saveViewSettings(viewList);
            return true;
        }
    }

    get availableColors() {
        return VIEW_COLORS;
    }

    get forPosts() {
        return this.viewList.filter(view => view.route === 'posts');
    }

    get forPages() {
        return this.viewList.filter(view => view.route === 'pages');
    }

    get activeView() {
        if (!this.router.currentRoute) {
            return undefined;
        }
        const found = this.findView(this.router.currentRouteName, this.router.currentRoute.queryParams);
        return found;
    }

    findView(routeName, queryParams) {
        let _routeName = routeName.replace(/_loading$/, '');
        return this.viewList.find((view) => {
            return view.route === _routeName
                && isFilterEqual(this.cleanFilter(view.filter), queryParams);
        });
    }

    cleanFilter(filter) {
        // Remove keys where the value is null or undefined using native JS methods
        return Object.fromEntries(
            Object.entries(filter).filter(([, value]) => value !== null)
        );
    }

    isFilterEqual(filterA, filterB) {
        const keysA = Object.keys(filterA);
        const keysB = Object.keys(filterB);

        if (keysA.length !== keysB.length) {
            return false;
        }

        return keysA.every(key => filterA[key] === filterB[key]);
    }

    newView() {
        return CustomView.create({
            isNew: true,
            route: this.router.currentRouteName,
            filter: this.router.currentRoute.queryParams
        });
    }

    @action
    editView() {
        const customView = CustomView.create(this.activeView || this.newView());

        return this.modals.open(CustomViewFormModal, {
            customView
        });
    }

    async _saveViewSettings(viewList) {
        let sharedViews = viewList.reject(view => view.isDefault).map(view => view.toJSON());
        this.settings.sharedViews = JSON.stringify(sharedViews);
        return this.settings.save();
    }
}
