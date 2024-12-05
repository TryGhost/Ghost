import NotificationIcon, {NotificationType} from './NotificationIcon';
import React from 'react';

// Context to share common props between compound components
interface NotificationContextType {
    onClick?: () => void;
    url?: string;
}

const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined);

// Root component
interface NotificationItemProps {
    children: React.ReactNode;
    onClick?: () => void;
    url?: string;
    className?: string;
}

const NotificationItem = ({children, onClick, url, className}: NotificationItemProps) => {
    const content = (
        <div className={`-mx-4 -my-px grid grid-cols-[auto_1fr] gap-2 rounded-lg p-4 hover:bg-grey-50 ${className}`}>
            {children}
        </div>
    );

    return (
        <NotificationContext.Provider value={{onClick, url}}>
            {url ? (
                <a className='block' href={url}>
                    {content}
                </a>
            ) : onClick ? (
                <button className='w-full text-left' type='button' onClick={onClick}>
                    {content}
                </button>
            ) : (
                content
            )}
        </NotificationContext.Provider>
    );
};

// Sub-components
const Icon = ({type}: {type: NotificationType}) => {
    return (
        <div className='col-start-1 row-start-1'>
            <NotificationIcon notificationType={type} />
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
        <div className='col-start-2 row-start-2'>
            {children}
        </div>
    );
};

// Attach sub-components to the main component
NotificationItem.Icon = Icon;
NotificationItem.Avatars = Avatars;
NotificationItem.Content = Content;

export default NotificationItem;
