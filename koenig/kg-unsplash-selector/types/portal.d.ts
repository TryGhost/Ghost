import React, { ReactNode } from 'react';
interface PortalProps {
    children: ReactNode;
    to?: Element;
    classNames?: string;
}
declare const Portal: React.FC<PortalProps>;
export default Portal;
