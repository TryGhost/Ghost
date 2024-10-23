import MainHeader from './MainHeader';
import React, {useEffect, useState} from 'react';
import {Button, Tooltip} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface MainNavigationProps {
    title?: string;
    page?: string;
    onLayoutChange?: (layout: string) => void;
}

const MainNavigation: React.FC<MainNavigationProps> = ({
    page = '',
    onLayoutChange
}) => {
    const {route, updateRoute} = useRouting();
    const mainRoute = route.split('/')[0];
    const [layout, setLayout] = useState('inbox');

    useEffect(() => {
        if (onLayoutChange) {
            onLayoutChange(layout);
        }
    }, [layout, onLayoutChange]);

    return (
        <MainHeader>
            <div className='col-[1/2] flex gap-8 px-8'>
                <Button className={` ${mainRoute === '' ? 'font-bold text-grey-975' : 'text-grey-700 hover:text-grey-800'}`} label='Inbox' unstyled onClick={() => updateRoute('')} />
                <Button className={` ${mainRoute === 'activity' ? 'font-bold text-grey-975' : 'text-grey-700 hover:text-grey-800'}`} label='Notifications' unstyled onClick={() => updateRoute('activity')} />
                <Button className={` ${mainRoute === 'search' ? 'font-bold text-grey-975' : 'text-grey-700 hover:text-grey-800'}`} label='Search' unstyled onClick={() => updateRoute('search')} />
                <Button className={` ${mainRoute === 'profile' ? 'font-bold text-grey-975' : 'text-grey-700 hover:text-grey-800'}`} label='Profile' unstyled onClick={() => updateRoute('profile')} />
            </div>
            <div className='col-[3/4] flex items-center justify-end gap-2 px-8'>
                {page === 'home' &&
                <div className='mr-3'>
                    <Tooltip content="Inbox">
                        <Button className='!px-2' icon='listview' iconColorClass={layout === 'inbox' ? 'text-black' : 'text-grey-400'} size='sm' onClick={() => {
                            setLayout('inbox');
                        }} />
                    </Tooltip>
                    <Tooltip content="Feed">
                        <Button className='!px-2' icon='card-list' iconColorClass={layout === 'feed' ? 'text-black' : 'text-grey-400'} size='sm' onClick={() => {
                            setLayout('feed');
                        }} />
                    </Tooltip>
                </div>
                }
            </div>
        </MainHeader>
    );
};

export default MainNavigation;