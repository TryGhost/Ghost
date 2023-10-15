import MasonryService from './masonry/MasonryService';
import Portal from './portal';
import React, {useMemo, useRef, useState} from 'react';
import UnsplashGallery from './ui/UnsplashGallery';
import UnsplashSelector from './ui/UnsplashSelector';
import {DefaultHeaderTypes, Photo} from './UnsplashTypes';
import {PhotoUseCases} from './photo/PhotoUseCase';
import {UnsplashProvider} from './api/UnsplashProvider';
import {UnsplashService} from './UnsplashService';

interface UnsplashModalProps {
    onClose: () => void;
    onImageInsert: (image: Photo) => void;
    unsplashConf: {
      defaultHeaders: DefaultHeaderTypes;
    };
  }

const UnsplashSearchModal : React.FC<UnsplashModalProps> = ({onClose, onImageInsert, unsplashConf}) => {
    const unsplashRepo = useMemo(() => new UnsplashProvider(unsplashConf.defaultHeaders), [unsplashConf.defaultHeaders]);
    const photoUseCase = useMemo(() => new PhotoUseCases(unsplashRepo), [unsplashRepo]);
    const masonryService = useMemo(() => new MasonryService(3), []);
    const UnsplashLib = useMemo(() => new UnsplashService(photoUseCase, masonryService), [photoUseCase, masonryService]);
    const galleryRef = useRef<HTMLDivElement | null>(null);
    const [scrollPos, setScrollPos] = useState<number>(0);
    const [lastScrollPos, setLastScrollPos] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(UnsplashLib.searchIsRunning() || true);
    const initLoadRef = useRef<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [zoomedImg, setZoomedImg] = useState<Photo | null>(null);
    const [dataset, setDataset] = useState<Photo[][] | []>([]);

    React.useEffect(() => {
        if (galleryRef.current && zoomedImg === null && lastScrollPos !== 0) {
            galleryRef.current.scrollTop = lastScrollPos;
            setLastScrollPos(0);
        }
    }, [zoomedImg, scrollPos, lastScrollPos]);

    React.useEffect(() => {
        const handleKeyDown = (e:KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    React.useEffect(() => {
        const ref = galleryRef.current;
        if (!zoomedImg) {
            if (ref) {
                ref.addEventListener('scroll', () => {
                    setScrollPos(ref.scrollTop);
                });
            }
            // unmount
            return () => {
                if (ref) {
                    ref.removeEventListener('scroll', () => {
                        setScrollPos(ref.scrollTop);
                    });
                }
            };
        }
    }, [galleryRef, zoomedImg]);

    const loadInitPhotos = React.useCallback(async () => {
        if (initLoadRef.current === false || searchTerm.length === 0) {
            setDataset([]);
            UnsplashLib.clearPhotos();
            await UnsplashLib.loadNew();
            const columns = UnsplashLib.getColumns();
            setDataset(columns || []);
            if (galleryRef.current && galleryRef.current.scrollTop !== 0) {
                galleryRef.current.scrollTop = 0;
            }
            setIsLoading(false);
        }
    }, [UnsplashLib, searchTerm]);

    const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        if (query.length > 2) {
            setZoomedImg(null);
            setSearchTerm(query);
        }
        if (query.length === 0) {
            setSearchTerm('');
            initLoadRef.current = false;
            await loadInitPhotos();
        }
    };

    const search = React.useCallback(async () => {
        if (searchTerm) {
            setIsLoading(true);
            setDataset([]);
            UnsplashLib.clearPhotos();
            await UnsplashLib.updateSearch(searchTerm);
            const columns = UnsplashLib.getColumns();
            if (columns) {
                setDataset(columns);
            }
            if (galleryRef.current && galleryRef.current.scrollTop !== 0) {
                galleryRef.current.scrollTop = 0;
            }
            setIsLoading(false);
        }
    }, [searchTerm, UnsplashLib]);

    React.useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (searchTerm.length > 2) {
                await search();
            } else {
                await loadInitPhotos();
            }
        }, 300);
        return () => {
            initLoadRef.current = true;
            clearTimeout(timeoutId);
        };
    }, [searchTerm, search, loadInitPhotos]);

    const loadMorePhotos = React.useCallback(async () => {
        setIsLoading(true);
        await UnsplashLib.loadNextPage();
        const columns = UnsplashLib.getColumns();
        setDataset(columns || []);
        setIsLoading(false);
    }, [UnsplashLib]);

    React.useEffect(() => {
        const ref = galleryRef.current;
        if (ref) {
            const handleScroll = async () => {
                if (zoomedImg === null && ref.scrollTop + ref.clientHeight >= ref.scrollHeight - 1000) {
                    await loadMorePhotos();
                }
            };
            ref.addEventListener('scroll', handleScroll);
            return () => {
                ref.removeEventListener('scroll', handleScroll);
            };
        }
    }, [galleryRef, loadMorePhotos, zoomedImg]);

    const selectImg = (payload:Photo) => {
        if (payload) {
            setZoomedImg(payload);
            setLastScrollPos(scrollPos);
        }

        if (payload === null) {
            setZoomedImg(null);
            if (galleryRef.current) {
                galleryRef.current.scrollTop = lastScrollPos;
            }
        }
    };

    async function insertImage(image:Photo) {
        if (image.src) {
            UnsplashLib.triggerDownload(image);
            onImageInsert(image);
        }
    }
    return (
        <Portal classNames='admin-x-settings'>
            <UnsplashSelector
                closeModal={onClose}
                handleSearch={handleSearch}
            >
                <UnsplashGallery
                    dataset={dataset}
                    error={null}
                    galleryRef={galleryRef}
                    insertImage={insertImage}
                    isLoading={isLoading}
                    selectImg={selectImg}
                    zoomed={zoomedImg}
                />
            </UnsplashSelector>
        </Portal>
    );
};

export default UnsplashSearchModal;
