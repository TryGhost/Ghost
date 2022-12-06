// Portal container that can be used to render floating elements, outside of the editor
import React from 'react';
import {createPortal} from 'react-dom';
import {$getNodeByKey, $createNodeSelection, $setSelection} from 'lexical';
import UnsplashSelector from './file-selectors/Unsplash/UnsplashSelector';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import KoenigComposerContext from '../../context/KoenigComposerContext';
import UnsplashService from '../../utils/services/unsplash';
import UnsplashGallery from './file-selectors/Unsplash/UnsplashGallery';
import {useMemo} from 'react';

const API_URL = 'https://api.unsplash.com';

const UnsplashModal = ({container, nodeKey, handleModalClose}) => {
    const [editor] = useLexicalComposerContext();
    const {unsplashConf} = React.useContext(KoenigComposerContext);
    const UnsplashLib = useMemo(() => new UnsplashService({API_URL, HEADERS: unsplashConf}), [unsplashConf]);

    const galleryRef = React.useRef(null);
    const [scrollPos, setScrollPos] = React.useState(0);
    const [lastScrollPos, setLastScrollPos] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(UnsplashLib.search_is_running || true);
    const initLoadRef = React.useRef(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [zoomedImg, setZoomedImg] = React.useState(null);
    const [dataset, setDataset] = React.useState(UnsplashLib.getColumns() || []);

    // const dataset = UnsplashLib.getColumns();

    React.useEffect(() => {
        if (zoomedImg === null && lastScrollPos !== 0) {
            galleryRef.current.scrollTop = lastScrollPos;
            setLastScrollPos(0);
        }
    }, [zoomedImg, scrollPos, lastScrollPos]);

    const portalContainer = container || document.querySelector('.koenig-lexical');

    const closeModalHandler = () => {
        // remove the image node from the editor
        if (nodeKey) {
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.remove();
            });
        }
        handleModalClose(false);
    };

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
            await UnsplashLib.clearPhotos();
            await UnsplashLib.loadNew();
            const columns = UnsplashLib.getColumns();
            setDataset(columns);
            if (galleryRef.current.scrollTop !== 0) {
                galleryRef.current.scrollTop = 0;
            }
            setIsLoading(false);
        }
    }, [UnsplashLib, searchTerm]);

    const handleSearch = async (e) => {
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
            UnsplashLib.clearPhotos();
            await UnsplashLib.updateSearch(searchTerm);
            const columns = UnsplashLib.getColumns();
            setDataset(columns);
            if (galleryRef.current.scrollTop !== 0) {
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
        setDataset(columns);
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

    const insertImageToNode = async (image) => {
        if (image.src) {
            UnsplashLib.triggerDownload(image);
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.setSrc(image.src);
                node.setImgHeight(image.height);
                node.setImgWidth(image.width);
                node.setCaption(image.caption);
                node.setAltText(image.alt);
                const nodeSelection = $createNodeSelection();
                nodeSelection.add(node.getKey());
                $setSelection(nodeSelection);
            });
            handleModalClose(false);
        }
    };

    const selectImg = (payload) => {
        if (payload) {
            setZoomedImg(payload);
            setLastScrollPos(scrollPos);
        }

        if (payload === null) {
            galleryRef.current.scrollTop = lastScrollPos;
            setZoomedImg(null);
        }
    };

    if (!portalContainer) {
        return null;
    }
    
    return createPortal(
        <UnsplashSelector
            closeModal={closeModalHandler}
            handleSearch={handleSearch}
        >
            <UnsplashGallery
                galleryRef={galleryRef}
                zoomed={zoomedImg}
                isLoading={isLoading}
                dataset={dataset}
                selectImg={selectImg}
                insertImage={insertImageToNode} 
                error={UnsplashGallery.error}
            />
        </UnsplashSelector>
        , portalContainer);
};

export default UnsplashModal;
