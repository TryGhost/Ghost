import React, { ReactNode } from 'react';
interface PortalProps {
    children: ReactNode;
    to?: Element;
    classNames?: string;
}
export declare const Portal: React.FC<PortalProps>;
export {};
