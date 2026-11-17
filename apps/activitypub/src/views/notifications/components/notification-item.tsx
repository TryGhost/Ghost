import NotificationIcon, { NotificationIconSize, NotificationType } from './notification-icon';
import React from 'react';
import { cn, useRowPress } from '@tryghost/shade/utils';
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
  const contentId = React.useId();
  const press = useRowPress<HTMLDivElement>({}, Boolean(onClick));

  return (
    <NotificationContext.Provider value={{ onClick, url }}>
      <div
        className={cn(
          rowSurface(onClick ? 'interactive' : 'static'),
          'group break-anywhere grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 border-b border-border-default py-5 text-left last:border-b-transparent',
          isGrouped ? 'grid' : 'flex',
          centerAlign ? 'items-center' : 'items-start',
          onClick && 'cursor-pointer',
          className,
        )}
        id={contentId}
        {...press}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest('a, button, input, select, textarea, [role="checkbox"]')) {
            return;
          }
          onClick?.();
        }}
      >
        {onClick && (
          <button
            aria-labelledby={contentId}
            className="absolute inset-0 -z-1 rounded-md border-0 bg-transparent p-0 focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden"
            type="button"
            onClick={onClick}
          />
        )}
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
