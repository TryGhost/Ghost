import * as React from 'react';

import Layout from '@components/layout';
import {useNotificationsForUser} from '@hooks/use-activity-pub-queries';

const NotificationsV2: React.FC = () => {
    const {data} = useNotificationsForUser('index');

    const notifications = (data?.pages.flatMap(page => page.notifications) ?? []);

    return (
        <Layout>
            <div className='z-0 flex w-full flex-col items-center justify-center'>
                {
                    notifications.map(notification => (
                        <div key={notification.id}>
                            <p>{notification.type} happened</p>
                        </div>
                    ))
                }
            </div>
        </Layout>
    );
};

export default NotificationsV2;
