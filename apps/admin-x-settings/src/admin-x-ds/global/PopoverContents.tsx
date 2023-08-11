import React from 'react';
import clsx from 'clsx';
import {usePopover} from '../providers/PopoverProvider';

const PopoverContents: React.FC = () => {
    const {open, positionX, positionY, contents, closePopover} = usePopover();

    if (!open) {
        return null;
    }

    const style: React.CSSProperties = {
        top: `${positionY}px`,
        left: `${positionX}px`
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            closePopover();
        }
    };

    let className = '';

    // if (!unstyled) {
    className = clsx(
        'fixed z-50 mt-2 origin-top-right rounded bg-white shadow-md ring-1 ring-[rgba(0,0,0,0.01)] focus:outline-none',
        open ? 'block' : 'hidden',
        className
    );
    // }

    const backdropClasses = clsx(
        'fixed inset-0 z-40',
        open ? 'block' : 'hidden'
    );

    return (
        <div className='fixed z-[9999] inline-block'>
            <div className={backdropClasses} data-testid="menu-overlay" onClick={handleBackdropClick}></div>
            <div className={className} style={style}>
                {contents}
            </div>
        </div>
    );
};

export default PopoverContents;