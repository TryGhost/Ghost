import NotificationIcon, { NotificationIconSize, NotificationType } from './notification-icon';
import React from 'react';
import { cn } from '@tryghost/shade/utils';
import { rowSurface } from '@tryghost/shade/components';

// Context to share common props between compound components
interface NotificationContextType {
  onClick?: () => void;
  url?: string;
}

const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined);

// Root component
interface NotificationItemProps {
  isGrouped?: boolean;
  centerAlign?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  url?: string;
  className?: string;
}

const NotificationItem = ({
  isGrouped,
  centerAlign,
  children,
  onClick,
  url,
  className,
}: NotificationItemProps) => {
  return (
    <NotificationContext.Provider value={{ onClick, url }}>
      <div
        className={cn(
          rowSurface(onClick ? 'interactive' : 'static'),
          'group break-anywhere grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 border-b border-border-default py-5 text-left last:border-b-transparent focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden',
          isGrouped ? 'grid' : 'flex',
          centerAlign ? 'items-center' : 'items-start',
          onClick && 'cursor-pointer',
          className,
        )}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest('a, button, input, select, textarea, [role="checkbox"]')) {
            return;
          }
          onClick?.();
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || !onClick) {
            return;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            onClick();
          } else if (event.key === ' ') {
            event.preventDefault();
          }
        }}
        onKeyUp={(event) => {
          if (event.target === event.currentTarget && event.key === ' ' && onClick) {
            event.preventDefault();
            onClick();
          }
        }}
      >
        {children}
      </div>
    </NotificationContext.Provider>
  );
};

// Sub-components
const Icon = ({ size = 'lg', type }: { size?: NotificationIconSize; type: NotificationType }) => {
  return (
    <div className="col-start-1 row-start-1">
      <NotificationIcon notificationType={type} size={size} />
    </div>
  );
};

const Avatars = ({ children }: { children: React.ReactNode }) => {
  return <div className="col-start-2 row-start-1 flex gap-2">{children}</div>;
};

const Content = ({ children }: { children: React.ReactNode }) => {
  return <div className="col-start-2 row-start-2 -mt-0.5 grow overflow-hidden">{children}</div>;
};

// Attach sub-components to the main component
NotificationItem.Icon = Icon;
NotificationItem.Avatars = Avatars;
NotificationItem.Content = Content;

export default NotificationItem;
