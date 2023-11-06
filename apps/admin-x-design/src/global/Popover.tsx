import clsx from 'clsx';
import React, {useRef, useState} from 'react';
import {createPortal} from 'react-dom';

export type PopoverPosition = 'left' | 'right';

export interface PopoverProps {
    trigger: React.ReactNode;
    children: React.ReactNode;
    position?: PopoverPosition;
    closeOnItemClick?: boolean;
}

const getOffsetPosition = (element: HTMLDivElement | null) => {
    // innerZoomElementWrapper fixes weird behaviour in Storybook - the preview container
    // uses transform which changes how position:fixed works and means getBoundingClientRect
    // won't return the right position
    return element?.closest('.innerZoomElementWrapper')?.getBoundingClientRect() || {x: 0, y: 0};
};

const Popover: React.FC<PopoverProps> = ({
    trigger,
    children,
    position = 'left',
    closeOnItemClick
}) => {
    const [open, setOpen] = useState(false);
    const [positionX, setPositionX] = useState(0);
    const [positionY, setPositionY] = useState(0);
    const triggerRef = useRef<HTMLDivElement | null>(null);

    const handleTriggerClick = () => {
        if (!open && triggerRef.current) {
            const parentRect = getOffsetPosition(triggerRef.current);
            const {x, y, width, height} = triggerRef.current.getBoundingClientRect();
            const relativeX = x - parentRect.x;
            const relativeY = y - parentRect.y;

            const finalX = (position === 'left') ? relativeX : window.innerWidth - (relativeX + width);
            setOpen(true);
            setPositionX(finalX);
            setPositionY(relativeY + height);
        } else {
            setOpen(false);
        }
    };

    const style: React.CSSProperties = {
        top: `${positionY}px`
    };

    if (position === 'left') {
        style.left = `${positionX}px`;
    } else {
        style.right = `${positionX}px`;
    }

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            setOpen(false);
        }
    };

    const handleContentClick = () => {
        if (closeOnItemClick) {
            setOpen(false);
        }
    };

    let className = '';

    className = clsx(
        'fixed z-50 mt-2 origin-top-right rounded bg-white shadow-md ring-1 ring-[rgba(0,0,0,0.01)] focus:outline-none dark:bg-grey-900 dark:text-white',
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
            {open && createPortal(<div className='fixed z-[9999] inline-block' onClick={handleContentClick}>
                <div className={backdropClasses} data-testid="popover-overlay" onClick={handleBackdropClick}></div>
                <div className={className} data-testid='popover-content' style={style}>
                    {children}
                </div>
            </div>, triggerRef.current?.closest('.admin-x-base') || document.body)}
        </>
    );
};

export default Popover;
