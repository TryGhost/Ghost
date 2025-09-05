import React, {useState, useCallback, useEffect, useRef} from 'react';
import {Search, X} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {LoadingIndicator} from '@/components/ui/loading-indicator';
import {Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import {useUnsplashPhotos, UnsplashPhoto} from '@/hooks/use-unsplash';
import {UnsplashPhotoComponent} from './unsplash-photo';
import {ReactComponent as UnsplashLogo} from '@/assets/icons/unsplash-logo.svg';

interface UnsplashBrowserProps {
    isOpen?: boolean;
    onClose?: () => void;
    onSelect: (photoData: {
        src: string;
        width: number;
        height: number;
        alt: string;
        caption: string;
    }) => void;
    showTrigger?: boolean;
    triggerClassName?: string;
}

export const UnsplashBrowser: React.FC<UnsplashBrowserProps> = ({
    isOpen,
    onClose,
    onSelect,
    showTrigger = false,
    triggerClassName
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [zoomedPhoto, setZoomedPhoto] = useState<UnsplashPhoto | null>(null);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 600);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Focus search input when opened
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const {
        photos,
        isLoading,
        isError,
        error,
        hasNextPage,
        isFetchingNextPage,
        loadNextPage,
        triggerDownload,
        retry
    } = useUnsplashPhotos(debouncedSearchTerm);

    // Handle keyboard events
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (zoomedPhoto) {
                    setZoomedPhoto(null);
                } else {
                    onClose?.();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, zoomedPhoto, onClose]);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setZoomedPhoto(null);
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearchTerm('');
        setZoomedPhoto(null);
    }, []);

    const handlePhotoSelect = useCallback(async (photo: UnsplashPhoto) => {
        await triggerDownload(photo);
        
        const selectParams = {
            src: photo.urls.regular.replace(/&w=\d+/, '&w=2000'),
            width: photo.width,
            height: photo.height,
            alt: photo.description || photo.alt_description || '',
            caption: `Photo by <a href="${photo.user.links.html}?utm_source=ghost&utm_medium=referral&utm_campaign=api-credit">${photo.user.name}</a> / <a href="https://unsplash.com/?utm_source=ghost&utm_medium=referral&utm_campaign=api-credit">Unsplash</a>`
        };
        
        onSelect(selectParams);
        onClose?.();
    }, [triggerDownload, onSelect, onClose]);

    const handlePhotoZoom = useCallback((photo: UnsplashPhoto) => {
        setZoomedPhoto(photo);
    }, []);

    const handleCloseZoom = useCallback(() => {
        setZoomedPhoto(null);
    }, []);

    // Intersection observer for infinite scroll
    const lastPhotoRef = useCallback((node: HTMLDivElement) => {
        if (isLoading || isFetchingNextPage) {
            return;
        }
        if (!hasNextPage) {
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                loadNextPage();
            }
        });

        if (node) {
            observer.observe(node);
        }
        return () => observer.disconnect();
    }, [isLoading, isFetchingNextPage, hasNextPage, loadNextPage]);

    const dialogContent = (
        <DialogContent 
            ref={containerRef}
            className="inset-y-8 max-w-[calc(100svw-6.4rem)] grid-rows-[auto_1fr_auto] items-start gap-0 overflow-y-auto p-0"
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    if (zoomedPhoto) {
                        handleCloseZoom();
                    } else if (onClose) {
                        onClose();
                    }
                }
            }}
        >
            {/* Header */}
            <DialogHeader className="sticky top-0 z-50 grid flex-none grid-cols-2 items-center gap-x-4 bg-gradient-to-b from-background via-background/90 to-background/70 p-4 backdrop-blur-md md:grid-cols-[1fr_auto_auto] md:p-8">
                <a 
                    className="col-span-1 flex items-center transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" 
                    href="https://unsplash.com/?utm_source=ghost&utm_medium=referral&utm_campaign=api-credit" 
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    <UnsplashLogo className="mr-2 size-4 fill-current md:size-6" />
                    <DialogTitle className="text-xl font-semibold md:text-3xl">Unsplash</DialogTitle>
                </a>
                
                <div className="relative col-span-2 col-start-1 row-start-2 w-full max-w-md md:col-span-1 md:col-start-2 md:row-start-1">
                    <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        ref={searchInputRef}
                        aria-label="Search Unsplash photos"
                        className="px-10"
                        placeholder="Search free high-resolution photos"
                        size={30}
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                    {searchTerm && (
                        <Button
                            aria-label="Clear search"
                            className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
                            size="icon"
                            variant="ghost"
                            onClick={handleClearSearch}
                        >
                            <X className="size-4" />
                        </Button>
                    )}
                </div>

                <DialogClose asChild>
                    <Button
                        aria-label="Close"
                        className="space-0 m-0 size-8"
                        size="icon"
                        variant="ghost"
                    >
                        <X className="size-8" />
                    </Button>
                </DialogClose>
            </DialogHeader>

            {/* Content */}
            <div className="h-full p-4 pt-0 md:p-8 md:pt-0">
                {isLoading && photos.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                        <LoadingIndicator size="lg" />
                    </div>
                ) : isError ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="mb-4 text-gray-500 dark:text-gray-400">
                            <X className="mx-auto mb-4 size-16" />
                            <h4 className="mb-2 text-lg font-medium">Error loading photos</h4>
                            <p className="mb-4 text-sm">{error}</p>
                            <Button variant="outline" onClick={retry}>
                                    Retry
                            </Button>
                        </div>
                    </div>
                ) : photos.length === 0 && debouncedSearchTerm ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="text-gray-500 dark:text-gray-400">
                            <Search className="mx-auto mb-4 size-16" />
                            <h4 className="mb-2 text-lg font-medium">No photos found</h4>
                            <p className="text-sm">No photos found for &apos;{debouncedSearchTerm}&apos;</p>
                        </div>
                    </div>
                ) : (
                    <div 
                        className={cn(
                            'columns-1 sm:columns-2 xl:columns-3 gap-4'
                        )}
                    >
                        {photos.map((photo, index) => (
                            <div
                                key={photo.id}
                                ref={index === photos.length - 1 ? lastPhotoRef : null}
                                className="break-inside-avoid"
                            >
                                <UnsplashPhotoComponent
                                    photo={photo}
                                    onSelect={handlePhotoSelect}
                                    onZoom={handlePhotoZoom}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Loading more indicator */}
                {isFetchingNextPage && (
                    <div className="mt-8 flex justify-center">
                        <LoadingIndicator size="md" />
                    </div>
                )}
            </div>

            {/* Zoomed photo overlay */}
            {zoomedPhoto && (
                <div 
                    className="absolute inset-0 flex items-center justify-center bg-white p-10 dark:bg-gray-900"
                    onClick={handleCloseZoom}
                >
                    <div className="max-h-full max-w-full">
                        <UnsplashPhotoComponent
                            className="max-h-[80vh] max-w-[80vw]"
                            photo={zoomedPhoto}
                            zoomed={true}
                            onSelect={handlePhotoSelect}
                        />
                    </div>
                </div>
            )}
        </DialogContent>
    );

    if (showTrigger) {
        return (
            <Dialog>
                <DialogTrigger asChild>
                    <Button 
                        aria-label="Open Unsplash photo browser"
                        className={cn('size-8', triggerClassName)}
                        size="icon"
                        variant="ghost"
                    >
                        <UnsplashLogo className="size-5 fill-current" />
                    </Button>
                </DialogTrigger>
                {dialogContent}
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={open => !open && onClose?.()}>
            {dialogContent}
        </Dialog>
    );
};
