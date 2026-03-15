import React, {useRef} from 'react';
import {Button, LoadingIndicator} from '@tryghost/shade';

interface ShowRepliesButtonProps {
    count?: number;
    onClick: () => void;
    variant?: 'default' | 'expand' | 'loadMore';
    preserveScroll?: boolean;
    loading?: boolean;
}

const ShowRepliesButton: React.FC<ShowRepliesButtonProps> = ({count, onClick, variant = 'default', preserveScroll = true, loading = false}) => {
    const buttonRef = useRef<HTMLDivElement>(null);

    const getButtonText = () => {
        if (count && count > 0) {
            return `Show ${count} more ${count === 1 ? 'reply' : 'replies'}`;
        }

        switch (variant) {
        case 'expand':
            return 'Show replies';
        case 'loadMore':
            return 'Show more replies';
        default:
            return 'Show replies';
        }
    };

    const handleClick = () => {
        if (preserveScroll) {
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
        } else {
            onClick();
        }
    };

    return (
        <div ref={buttonRef} className='mt-[-7px] flex items-center pb-3'>
            <div className='flex w-10 flex-col items-center justify-center gap-1'>
                <div className='size-0.5 rounded-sm bg-gray-300'></div>
                <div className='size-0.5 rounded-sm bg-gray-300'></div>
                <div className='size-0.5 rounded-sm bg-gray-300'></div>
            </div>
            <Button
                className='hover:text-blue-800 text-sm font-medium text-blue-600'
                variant="ghost"
                onClick={(e: React.MouseEvent<HTMLElement>) => {
                    e.preventDefault();
                    e.stopPropagation();
                    (e.target as HTMLElement).blur();
                    handleClick();
                }}
            >
                {loading ? (
                    <div className='flex items-center gap-2'>
                        <LoadingIndicator size='sm' />
                        <span>Loading...</span>
                    </div>
                ) : (
                    getButtonText()
                )}
            </Button>
        </div>
    );
};

export default ShowRepliesButton;
