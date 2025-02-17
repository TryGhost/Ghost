import * as React from 'react';
import Recommendations from './Recommendations';
import {Button, Separator, cn} from '@tryghost/shade';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface SidebarProps
    extends React.HTMLAttributes<HTMLDivElement> {}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
    ({className, ...props}, ref) => {
        const {updateRoute} = useRouting();

        return (
            <div
                ref={ref}
                className={cn(
                    'border-l border-gray-200 fixed top-[102px] right-8 w-[294px] min-h-[calc(100vh-102px-32px)]',
                    'pointer-events-none',
                    '[&>*]:pointer-events-auto',
                    className
                )}
                {...props}
            >
                <div className='flex flex-col gap-8 pl-5 pt-5'>
                    <div className='flex flex-col gap-2'>
                        <Button className='justify-start' variant='ghost' onClick={() => updateRoute('inbox')}>Inbox</Button>
                        <Button className='justify-start' variant='ghost' onClick={() => updateRoute('feed')}>Feed</Button>
                        <Button className='justify-start' variant='ghost' onClick={() => updateRoute('notifications')}>Notifications</Button>
                        <Button className='justify-start' variant='ghost' onClick={() => updateRoute('profile')}>Profile</Button>
                    </div>

                    <div>
                        <Button onClick={() => updateRoute('feed')}>New note</Button>
                    </div>

                    <Separator />

                    <Recommendations />
                </div>
            </div>
        );
    }
);

Sidebar.displayName = 'Sidebar';

export default Sidebar;
