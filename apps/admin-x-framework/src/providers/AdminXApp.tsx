import {DesignSystemApp, DesignSystemAppProps} from '@tryghost/admin-x-design-system';
import {ReactNode} from 'react';
import FrameworkProvider, {FrameworkProviderProps} from './FrameworkProvider';

const AdminXApp: React.FC<FrameworkProviderProps & DesignSystemAppProps & {children: ReactNode}> = ({
    basePath,
    ghostVersion,
    externalNavigate,
    unsplashConfig,
    sentryDSN,
    onUpdate,
    onInvalidate,
    onDelete,
    children,
    ...props
}) => {
    const frameworkProps = {
        basePath,
        ghostVersion,
        externalNavigate,
        unsplashConfig,
        sentryDSN,
        onUpdate,
        onInvalidate,
        onDelete
    };

    return (
        <FrameworkProvider {...frameworkProps}>
            <DesignSystemApp {...props}>
                {children}
            </DesignSystemApp>
        </FrameworkProvider>
    );
};

export default AdminXApp;
