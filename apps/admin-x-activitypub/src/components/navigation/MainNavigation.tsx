import MainHeader from './MainHeader';
import React from 'react';
import {Button} from '@tryghost/admin-x-design-system';
import {useQueryClient} from '@tanstack/react-query';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface MainNavigationProps {
    page: string;
    layout?: 'feed' | 'inbox';
    setFeed?: () => void;
    setInbox?: () => void;
}

const MainNavigation: React.FC<MainNavigationProps> = ({
    setFeed,
    setInbox
}) => {
    const {route, updateRoute} = useRouting();
    const mainRoute = route.split('/')[0];
    const queryClient = useQueryClient();

    const handleRouteChange = (newRoute: string) => {
        queryClient.removeQueries({
            queryKey: ['activities:index']
        });
        
        updateRoute(newRoute);
        if (newRoute === 'feed') {
            setFeed?.();
        } else if (newRoute === 'inbox') {
            setInbox?.();
        }
    };

    return (
        <MainHeader>
            <div className='col-[1/2] flex gap-8 px-8'>
                <Button 
                    className={`${mainRoute === 'inbox' ? 'font-bold text-grey-975' : 'text-grey-700 hover:text-grey-800'}`} 
                    label='Inbox' 
                    unstyled 
                    onClick={() => handleRouteChange('inbox')} 
                />
                <Button 
                    className={`${mainRoute === 'feed' ? 'font-bold text-grey-975' : 'text-grey-700 hover:text-grey-800'}`} 
                    label='Feed' 
                    unstyled 
                    onClick={() => handleRouteChange('feed')} 
                />
                <Button className={`${mainRoute === 'activity' ? 'font-bold text-grey-975' : 'text-grey-700 hover:text-grey-800'}`} label='Notifications' unstyled onClick={() => updateRoute('activity')} />
                <Button className={`${mainRoute === 'search' ? 'font-bold text-grey-975' : 'text-grey-700 hover:text-grey-800'}`} label='Search' unstyled onClick={() => updateRoute('search')} />
                <Button className={`${mainRoute === 'profile' ? 'font-bold text-grey-975' : 'text-grey-700 hover:text-grey-800'}`} label='Profile' unstyled onClick={() => updateRoute('profile')} />
            </div>
        </MainHeader>
    );
};

export default MainNavigation;
