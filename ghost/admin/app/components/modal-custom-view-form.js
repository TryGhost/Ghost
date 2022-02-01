import ModalComponent from 'ghost-admin/components/modal-base';
import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {resetQueryParams} from 'ghost-admin/helpers/reset-query-params';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

@classic
export default class ModalCustomViewForm extends ModalComponent {
    @service
    customViews;

    @service
    router;

    delayedModelColor = '';

    init() {
        super.init(...arguments);
        this.set('model', this.customViews.editView());
        this._setDelayedModelColor.perform();
    }

    @action
    changeColor(event) {
        let color = event.target.value;
        this.set('model.color', color);
        this.set('delayedModelColor', color);
    }

    @action
    confirm() {
        return this.saveTask.perform();
    }

    @task(function* () {
        let view = yield this.customViews.saveViewTask.perform(this.model);
        this.send('closeModal');
        return view;
    })
    saveTask;

    @task(function* () {
        let view = yield this.customViews.deleteViewTask.perform(this.model);
        let routeName = this.router.currentRouteName;
        this.send('closeModal');
        this.router.transitionTo(routeName, {queryParams: resetQueryParams(routeName)});
        return view;
    })
    deleteTask;

    // this is a hack to get around radio buttons not working with liquid-fire.
    // The DOM is duplicated whilst animating-in so browsers end up setting the
    // checked property on the temporary DOM. Delaying the value being set
    // allows us to ensure we're updating the checked property after animation
    @task(function* () {
        yield timeout(200);
        this.set('delayedModelColor', this.model.color);
    })
    _setDelayedModelColor;
}
