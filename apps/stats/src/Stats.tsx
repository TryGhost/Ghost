import React from 'react';
import {Outlet} from '@tryghost/admin-x-framework';
import {hasAdminAccess} from '@tryghost/admin-x-framework/api/users';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/currentUser';

const Stats: React.FC = () => {
    const {data: currentUser} = useCurrentUser();
    const isAdminUser = currentUser ? hasAdminAccess(currentUser) : false;

    // Only render for admin users
    if (!isAdminUser) {
        return null;
    }

    return <Outlet />;
};

export default Stats; 