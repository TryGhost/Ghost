import {Activity} from './activity.entity';

export interface ActivityRepository {
    getOne(id: URL): Promise<Activity | null>
    save(activity: Activity): Promise<void>
}
