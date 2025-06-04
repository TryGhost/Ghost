import React, {useRef} from 'react';
import {Button} from '@tryghost/shade';

interface ShowRepliesButtonProps {
    count: number;
    onClick: () => void;
}

const ShowRepliesButton: React.FC<ShowRepliesButtonProps> = ({count, onClick}) => {
    const buttonRef = useRef<HTMLDivElement>(null);

    const handleClick = () => {
        const container = document.querySelector('[data-scrollable-container]') as HTMLElement;
        const scrollTop = container ? container.scrollTop : window.scrollY;

        onClick();

        setTimeout(() => {
            if (container) {
                container.scrollTop = scrollTop;
            } else {
                window.scrollTo(0, scrollTop);
            }
        }, 0);
    };

    return (
        <div ref={buttonRef} className="flex items-center justify-center py-3">
            <Button
                className="hover:text-blue-800 text-sm font-medium text-blue-600"
                variant="ghost"
                onClick={(e: React.MouseEvent<HTMLElement>) => {
                    e.preventDefault();
                    e.stopPropagation();
                    (e.target as HTMLElement).blur();
                    handleClick();
                }}
            >
                Show {count} more {count === 1 ? 'reply' : 'replies'}
            </Button>
        </div>
    );
};

export default ShowRepliesButton;
