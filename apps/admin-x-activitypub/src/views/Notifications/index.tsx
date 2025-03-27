import {useFeatureFlags} from '@src/lib/feature-flags';

import NotificationsV1 from './Notifications';
import NotificationsV2 from './NotificationsV2';

const Notifications = () => {
    const {isEnabled} = useFeatureFlags();

    return isEnabled('notificationsV2') ? <NotificationsV2 /> : <NotificationsV1 />;
};

export default Notifications;
