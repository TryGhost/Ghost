import moment from 'moment';
import {helper} from '@ember/component/helper';

export function mostRecentlyUpdated(objs) {
    const items = [...(objs || [])];

    (items || []).sort((a, b) => {
        const momentA = moment(a.updatedAtUTC || a.updatedAt || a.updated_at);
        const momentB = moment(b.updatedAtUTC || b.updatedAt || b.updated_at);

        return momentB.valueOf() - momentA.valueOf();
    });

    return items[0] || null;
}

export default helper(function ([items = []]) {
    return mostRecentlyUpdated(items);
});
