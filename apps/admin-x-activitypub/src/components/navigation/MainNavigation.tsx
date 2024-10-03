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
    title = 'Home',
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
            <div className='col-[1/2] px-8'>
                <h2 className='mt-1 text-xl font-bold'>
                    {title}
                </h2>
            </div>
            <div className='col-[2/3] flex items-center justify-center gap-9'>
                <Button icon='home' iconColorClass={mainRoute === '' ? 'text-black' : 'text-grey-500'} iconSize={18} unstyled onClick={() => updateRoute('')} />
                <Button icon='magnifying-glass' iconColorClass={mainRoute === 'search' ? 'text-black' : 'text-grey-500'} iconSize={18} unstyled onClick={() => updateRoute('search')} />
                <Button icon='bell' iconColorClass={mainRoute === 'activity' ? 'text-black' : 'text-grey-500'} iconSize={18} unstyled onClick={() => updateRoute('activity')} />
                <Button icon='user' iconColorClass={mainRoute === 'profile' ? 'text-black' : 'text-grey-500'} iconSize={18} unstyled onClick={() => updateRoute('profile')} />
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
                <Button color='black' icon='add' label="Follow" onClick={() => {
                    updateRoute('follow-site');
                }} />
            </div>
        </MainHeader>
    );
};

export default MainNavigation;