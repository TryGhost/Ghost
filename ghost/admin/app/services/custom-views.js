import EmberObject, {action} from '@ember/object';
import Service from '@ember/service';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {isArray} from '@ember/array';
import {observes} from '@ember-decorators/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

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
    icon: 'pencil',
    filter: {
        type: 'draft'
    }
}, {
    route: 'posts',
    name: 'Scheduled',
    color: 'midgrey',
    icon: 'clockface',
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
    @service router;
    @service session;
    @service settings;

    @tracked viewList = [];
    @tracked showFormModal = false;

    constructor() {
        super(...arguments);
        this.updateViewList();
    }

    // eslint-disable-next-line ghost/ember/no-observers
    @observes('settings.sharedViews', 'session.isAuthenticated')
    async updateViewList() {
        let {settings, session} = this;

        // avoid fetching user before authenticated otherwise the 403 can fire
        // during authentication and cause errors during setup/signin
        if (!session.isAuthenticated) {
            return;
        }

        let views = JSON.parse(settings.get('sharedViews') || '[]');
        views = isArray(views) ? views : [];

        let viewList = [];

        // contributors can only see their own draft posts so it doesn't make
        // sense to show them default views which change the status/type filter
        let user = await session.user;
        if (!user.isContributor) {
            viewList.push(...DEFAULT_VIEWS);
        }

        viewList.push(...views.map((view) => {
            return CustomView.create(view);
        }));

        this.viewList = viewList;
    }

    @action
    toggleFormModal() {
        this.showFormModal = !this.showFormModal;
    }

    @task
    *saveViewTask(view) {
        yield view.validate();

        // perform some ad-hoc validation of duplicate names because ValidationEngine doesn't support it
        let duplicateView = this.viewList.find((existingView) => {
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
        let matchingView = this.viewList.find(existingView => isViewEqual(existingView, view));
        if (matchingView) {
            this.viewList.replace(this.viewList.indexOf(matchingView), 1, [view]);
        } else {
            this.viewList.push(view);
        }

        // rebuild the "views" array in our user settings json string
        yield this._saveViewSettings();

        view.set('isNew', false);
        return view;
    }

    @task
    *deleteViewTask(view) {
        let matchingView = this.viewList.find(existingView => isViewEqual(existingView, view));
        if (matchingView && !matchingView.isDefault) {
            this.viewList.removeObject(matchingView);
            yield this._saveViewSettings();
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
        return this.findView(this.router.currentRouteName, this.router.currentRoute.queryParams);
    }

    findView(routeName, queryParams) {
        let _routeName = routeName.replace(/_loading$/, '');

        return this.viewList.find((view) => {
            return view.route === _routeName
                && isFilterEqual(view.filter, queryParams);
        });
    }

    newView() {
        return CustomView.create({
            isNew: true,
            route: this.router.currentRouteName,
            filter: this.router.currentRoute.queryParams
        });
    }

    editView() {
        return CustomView.create(this.activeView || this.newView());
    }

    async _saveViewSettings() {
        let sharedViews = this.viewList.reject(view => view.isDefault).map(view => view.toJSON());
        this.settings.set('sharedViews', JSON.stringify(sharedViews));
        return this.settings.save();
    }
}
