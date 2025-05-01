import NotificationIcon, {NotificationIconSize, NotificationType} from './NotificationIcon';
import React from 'react';

// Context to share common props between compound components
interface NotificationContextType {
    onClick?: () => void;
    url?: string;
}

const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined);

// Root component
interface NotificationItemProps {
    isGrouped?: boolean;
    children: React.ReactNode;
    onClick?: () => void;
    url?: string;
    className?: string;
}

const NotificationItem = ({isGrouped, children, onClick, url, className}: NotificationItemProps) => {
    return (
        <NotificationContext.Provider value={{onClick, url}}>
            <div className={`group relative -mx-4 -my-px ${isGrouped ? 'grid' : 'flex'} cursor-pointer grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 rounded-lg px-4 py-5 text-left break-anywhere hover:bg-gray-75 ${className}`}
                role='button'
                onClick={onClick}
            >
                {children}
            </div>
        </NotificationContext.Provider>
    );
};

// Sub-components
const Icon = ({size = 'lg', type}: {size?: NotificationIconSize; type: NotificationType}) => {
    return (
        <div className='col-start-1 row-start-1'>
            <NotificationIcon notificationType={type} size={size} />
        </div>
    );
};

const Avatars = ({children}: {children: React.ReactNode}) => {
    return (
        <div className='col-start-2 row-start-1 flex gap-2'>
            {children}
        </div>
    );
};

const Content = ({children}: {children: React.ReactNode}) => {
    return (
        <div className='col-start-2 row-start-2 -mt-0.5 overflow-hidden'>
            {children}
        </div>
    );
};

// Attach sub-components to the main component
NotificationItem.Icon = Icon;
NotificationItem.Avatars = Avatars;
NotificationItem.Content = Content;

export default NotificationItem;
