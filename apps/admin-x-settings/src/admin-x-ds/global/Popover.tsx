import React, {useRef} from 'react';
import {usePopover} from '../providers/PopoverProvider';

export type PopoverPosition = 'left' | 'right';

interface PopoverProps {
    trigger: React.ReactNode;
    children: React.ReactNode;
    position?: PopoverPosition;
}

const Popover: React.FC<PopoverProps> = ({
    trigger,
    children,
    position = 'left'
}) => {
    const {openPopover} = usePopover();
    const triggerRef = useRef<HTMLDivElement | null>(null);

    const handleTriggerClick = () => {
        if (triggerRef.current) {
            const {x, y, width, height} = triggerRef.current.getBoundingClientRect();
            const finalX = (position === 'left') ? x : x - width;
            openPopover(finalX, y + height, children);
        }
    };

    return (
        <div ref={triggerRef} onClick={handleTriggerClick}>
            {trigger}
        </div>
    );
};

export default Popover;