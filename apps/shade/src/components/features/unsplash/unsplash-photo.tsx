import React from 'react';
import {cn} from '@/lib/utils';
import {UnsplashPhoto} from '@/hooks/use-unsplash';
import {Button} from '@/components/ui/button';

interface UnsplashPhotoProps {
    photo: UnsplashPhoto;
    onSelect: (photo: UnsplashPhoto) => void;
    onZoom?: (photo: UnsplashPhoto) => void;
    zoomed?: boolean;
    className?: string;
}

export const UnsplashPhotoComponent: React.FC<UnsplashPhotoProps> = ({
    photo,
    onSelect,
    onZoom,
    zoomed = false,
    className
}) => {
    const handleClick = () => {
        onZoom?.(photo);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    };

    const imageUrl = photo.urls.regular;

    const containerClasses = cn(
        'group relative overflow-hidden bg-gray-100 transition-all duration-200',
        zoomed ? 'h-full max-w-full cursor-zoom-out' : 'cursor-zoom-in hover:shadow-lg mb-4',
        className
    );

    const imageClasses = cn(
        'transition-transform duration-200',
        zoomed ? 'h-full object-contain' : 'w-full object-cover'
    );

    return (
        <div
            aria-label={
                photo.description || photo.alt_description || 'Unsplash photo'
            }
            className={containerClasses}
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
        >
            <img
                alt={photo.description || photo.alt_description || ''}
                className={imageClasses}
                loading="lazy"
                src={imageUrl}
                style={{
                    aspectRatio: photo.ratio ? `${1 / photo.ratio}` : 'auto'
                }}
            />

            {/* Overlay with photographer info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <p className="truncate text-sm font-medium">
                        {photo.user.name}
                    </p>
                    {photo.description && (
                        <p className="truncate text-xs opacity-90">
                            {photo.description}
                        </p>
                    )}
                </div>
            </div>

            <Button
                className="absolute bottom-2 right-2"
                onClick={() => onSelect(photo)}
            >
                Insert image
            </Button>
        </div>
    );
};
