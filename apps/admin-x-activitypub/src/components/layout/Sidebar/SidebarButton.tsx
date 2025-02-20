import * as React from 'react';
import {Button, ButtonProps, cn} from '@tryghost/shade';
import {useLocation, useNavigate} from '@tryghost/admin-x-framework';

interface SidebarButtonProps extends ButtonProps {
    route?: string;
    children: React.ReactNode;
}

const SidebarButton = React.forwardRef<HTMLButtonElement, SidebarButtonProps>(
    ({route, children, ...props}, ref) => {
        const location = useLocation();
        const navigate = useNavigate();
        return (
            <Button
                ref={ref}
                className={cn(
                    'justify-start text-md font-medium text-gray-800 dark:hover:bg-gray-925/70 dark:text-gray-500 h-9 [&_svg]:size-[18px]',
                    location.pathname === route ? 'bg-gray-100 dark:bg-gray-925/70 dark:text-white text-black font-semibold' : ''
                )}
                variant='ghost'
                onClick={() => {
                    if (route && !props.onClick) {
                        return navigate(route);
                    } else {
                        props.onClick;
                    }
                }}
                {...props}
            >
                {children}
            </Button>
        );
    }
);

SidebarButton.displayName = 'SidebarButton';

export default SidebarButton;
