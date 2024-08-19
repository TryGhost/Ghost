import MainHeader from './MainHeader';
import React from 'react';
import {Button} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface MainNavigationProps {}

const MainNavigation: React.FC<MainNavigationProps> = ({}) => {
    const {route, updateRoute} = useRouting();
    const mainRoute = route.split('/')[0];

    return (
        <MainHeader>
            <div className='col-[2/3] flex items-center justify-center gap-9'>
                <Button icon='home' iconColorClass={mainRoute === '' ? 'text-black' : 'text-grey-500'} iconSize={18} unstyled onClick={() => updateRoute('')} />
                <Button icon='magnifying-glass' iconColorClass={mainRoute === 'search' ? 'text-black' : 'text-grey-500'} iconSize={18} unstyled onClick={() => updateRoute('search')} />
                <Button icon='bell' iconColorClass={mainRoute === 'activity' ? 'text-black' : 'text-grey-500'} iconSize={18} unstyled onClick={() => updateRoute('activity')} />
                <Button icon='user' iconColorClass={mainRoute === 'profile' ? 'text-black' : 'text-grey-500'} iconSize={18} unstyled onClick={() => updateRoute('profile')} />
            </div>
            <div className='col-[3/4] flex items-center justify-end px-8'>
                <Button color='black' icon='add' label="Follow" onClick={() => {
                    updateRoute('follow-site');
                }} />
            </div>
        </MainHeader>
    );
};

export default MainNavigation;