import Component from '@glimmer/component';
import {action} from '@ember/object';
import {resetQueryParams} from 'ghost-admin/helpers/reset-query-params';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class CustomViewFormModal extends Component {
    @service customViews;
    @service router;

    static modalOptions = {
        className: 'fullscreen-modal-action fullscreen-modal-narrow'
    };

    @action
    changeColor(event) {
        const color = event.target.value;
        this.args.data.customView.set('color', color);
    }

    @action
    validate(property) {
        return this.args.data.customView.validate({property});
    }

    @task
    *saveTask() {
        const view = yield this.customViews.saveViewTask.perform(this.args.data.customView);
        this.args.close();
        return view;
    }

    @task
    *deleteTask() {
        const view = yield this.customViews.deleteViewTask.perform(this.args.data.customView);

        const routeName = this.router.currentRouteName;
        this.router.transitionTo(routeName, {queryParams: resetQueryParams(routeName)});

        this.args.close();
        return view;
    }
}
