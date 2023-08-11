import React, {useState} from 'react';
import clsx from 'clsx';

export type PopoverPosition = 'left' | 'right';

interface PopoverProps {
    trigger?: React.ReactNode;
    position?: PopoverPosition;
    unstyled?: boolean;
    className?: string;
    children?: React.ReactNode;
}

const Popover: React.FC<PopoverProps> = ({
    trigger,
    position = 'left',
    unstyled = false,
    className,
    children
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const togglePopover = () => {
        setIsOpen(!isOpen);
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            setIsOpen(false);
        }
    };

    if (!unstyled) {
        className = clsx(
            'absolute z-50 mt-2 origin-top-right rounded bg-white shadow-md ring-1 ring-[rgba(0,0,0,0.01)] focus:outline-none',
            position === 'left' ? 'left-0' : 'right-0',
            isOpen ? 'block' : 'hidden',
            className
        );
    }

    const backdropClasses = clsx(
        'fixed inset-0 z-40',
        isOpen ? 'block' : 'hidden'
    );

    return (
        <div className='relative inline-block'>
            <div className={backdropClasses} data-testid="menu-overlay" onClick={handleBackdropClick}></div>
            {/* Trigger */}
            <div className='relative z-30' onClick={togglePopover}>
                {trigger}
            </div>
            {/* Popover */}
            <div className={className} role="menu">
                {children}
            </div>
        </div>
    );
};

export default Popover;