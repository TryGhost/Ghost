import {Activity} from '../../core/activitypub/activity.entity';
import {ActivityRepository} from '../../core/activitypub/activity.repository';

export class ActivityRepositoryInMemory implements ActivityRepository {
    private activities: Activity[] = [];

    async getOne(id: URL) {
        const found = this.activities.find(entity => entity.activityId?.href === id.href);
        if (!found) {
            return null;
        }
        return found;
    }

    async save(activity: Activity) {
        this.activities.push(activity);
    }
}
