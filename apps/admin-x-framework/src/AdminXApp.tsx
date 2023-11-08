import {DesignSystemApp, DesignSystemAppProps} from '@tryghost/admin-x-design-system';
import {ReactNode} from 'react';
import FrameworkProvider, {FrameworkProviderProps} from './providers/FrameworkProvider';

const AdminXApp: React.FC<FrameworkProviderProps & DesignSystemAppProps & {children: ReactNode}> = ({children, ...props}) => {
    return (
        <FrameworkProvider {...props}>
            <DesignSystemApp {...props}>
                {children}
            </DesignSystemApp>
        </FrameworkProvider>
    );
};

export default AdminXApp;
