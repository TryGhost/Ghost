import React, {ReactNode} from 'react';
import {createPortal} from 'react-dom';

interface PortalProps {
  children: ReactNode;
  to?: Element;
}

const Portal: React.FC<PortalProps> = ({children, to}) => {
    const container: Element = to || document.body;

    if (!container) {
        return <>{children}</>;
    }

    const cancelEvents = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        event.stopPropagation();
    };

    return createPortal(
        <div onMouseDown={cancelEvents}>
            <div>
                {children}
            </div>
        </div>,
        container
    );
};

export default Portal;
