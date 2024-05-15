import {BaseEvent} from '../../common/event.base';
import {Activity} from './activity.entity';
import {Actor} from './actor.entity';

type ActivityEventData = {
    activity: Activity,
    actor: Actor
}

export class ActivityEvent extends BaseEvent<ActivityEventData> {
    static create(activity: Activity, actor: Actor) {
        return new ActivityEvent({activity, actor});
    }
}
