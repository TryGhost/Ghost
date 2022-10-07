import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class GhMembersNoMembersComponent extends Component {
    @service session;
    @service store;
    @service notifications;
    @service settings;

    @action
    addYourself() {
        return this.addTask.perform();
    }

    @task({drop: true})
    *addTask() {
        const user = yield this.session.user;
        const defaultNewsletters = yield this.store.query('newsletter', {filter: 'status:active+subscribe_on_signup:true+visibility:members'});

        const member = this.store.createRecord('member', {
            email: user.get('email'),
            name: user.get('name'),
            newsletters: defaultNewsletters
        });

        try {
            yield member.save();

            if (this.args.afterCreate) {
                this.args.afterCreate();
            }

            this.notifications.showNotification('Member added',
                {
                    description: 'You\'ve successfully added yourself as a member.'
                }
            );

            return member;
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error, {key: 'member.save'});
            }
        }
    }
}
