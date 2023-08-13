import React, {useRef, useState} from 'react';
import clsx from 'clsx';
import {createPortal} from 'react-dom';

export type PopoverPosition = 'left' | 'right';

interface PopoverProps {
    trigger: React.ReactNode;
    children: React.ReactNode;
    position?: PopoverPosition;
}

const getOffsetParent = (element: HTMLDivElement | null) => {
    // innerZoomElementWrapper fixes weird behaviour in Storybook - the preview container
    // uses transform which changes how position:fixed works and means getBoundingClientRect
    // won't return the right position
    return element?.closest('.innerZoomElementWrapper') || document.body;
};

const Popover: React.FC<PopoverProps> = ({
    trigger,
    children,
    position = 'left'
}) => {
    const [open, setOpen] = useState(false);
    const [positionX, setPositionX] = useState(0);
    const [positionY, setPositionY] = useState(0);
    const triggerRef = useRef<HTMLDivElement | null>(null);

    const handleTriggerClick = () => {
        if (!open && triggerRef.current) {
            const parentRect = getOffsetParent(triggerRef.current).getBoundingClientRect();
            let {x, y, width, height} = triggerRef.current.getBoundingClientRect();
            x -= parentRect.x;
            y -= parentRect.y;

            const finalX = (position === 'left') ? x : x - width;
            setOpen(true);
            setPositionX(finalX);
            setPositionY(y + height);
        } else {
            setOpen(false);
        }
    };

    const style: React.CSSProperties = {
        top: `${positionY}px`,
        left: `${positionX}px`
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            setOpen(false);
        }
    };

    let className = '';

    className = clsx(
        'fixed z-50 mt-2 origin-top-right rounded bg-white shadow-md ring-1 ring-[rgba(0,0,0,0.01)] focus:outline-none',
        className
    );

    const backdropClasses = clsx(
        'fixed inset-0 z-40',
        open ? 'block' : 'hidden'
    );

    return (
        <>
            <div ref={triggerRef} onClick={handleTriggerClick}>
                {trigger}
            </div>
            {open && createPortal(<div className='fixed z-[9999] inline-block'>
                <div className={backdropClasses} data-testid="menu-overlay" onClick={handleBackdropClick}></div>
                <div className={className} style={style}>
                    {children}
                </div>
            </div>, triggerRef.current?.closest('.admin-x-settings') || document.body)}
        </>
    );
};

export default Popover;
