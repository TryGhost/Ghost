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

const UnsplashModal = ({service, container, nodeKey, handleModalClose}) => {
    const galleryRef = React.useRef(null);
    const [scrollPos, setScrollPos] = React.useState(0);
    const [lastScrollPos, setLastScrollPos] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(true);
    const initLoadRef = React.useRef(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [editor] = useLexicalComposerContext();
    const {unsplashConf} = React.useContext(KoenigComposerContext);
    const [zoomedImg, setZoomedImg] = React.useState(null);

    const selectImg = (payload) => {
        // set the scroll position to the last position
        if (payload) {
            setZoomedImg(payload);
            setLastScrollPos(scrollPos);
        }

        if (payload === null) {
            galleryRef.current.scrollTop = lastScrollPos;
            setZoomedImg(null);
        }
    };

    React.useEffect(() => {
        if (zoomedImg === null && lastScrollPos !== 0) {
            galleryRef.current.scrollTop = lastScrollPos;
            setLastScrollPos(0);
        }
    }, [zoomedImg, scrollPos, lastScrollPos]);

    const API_URL = 'https://api.unsplash.com';

    const UnsplashLib = useMemo(() => new UnsplashService({API_URL, HEADERS: unsplashConf}), [unsplashConf]);

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
            // should send api request to tell unsplash we used the image
        }
    };

    const loadInitPhotos = React.useCallback(async () => {
        if (initLoadRef.current === false || searchTerm.length === 0) {
            UnsplashLib.clearPhotos();
            await UnsplashLib.loadNew();
            setIsLoading(false);
        }
    }, [UnsplashLib, searchTerm]);

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchTerm(query);
    };

    const search = React.useCallback(async () => {
        if (searchTerm) {
            setIsLoading(true);
            UnsplashLib.clearPhotos();
            await UnsplashLib.updateSearch(searchTerm);
            setIsLoading(false);
        }
    }, [searchTerm, UnsplashLib]);

    React.useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchTerm.length > 0 && searchTerm.length < 3) {
                galleryRef.current.scrollTop = 0;
            }
            if (searchTerm.length > 2) {
                search();
            } else {
                loadInitPhotos();
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
        setIsLoading(false);
    }, [UnsplashLib]);

    React.useEffect(() => {
        const ref = galleryRef.current;
        if (ref) {
            const handleScroll = () => {
                if (ref.scrollTop + ref.clientHeight >= ref.scrollHeight - 1000) {
                    loadMorePhotos();
                }
            };
            ref.addEventListener('scroll', handleScroll);
            return () => {
                ref.removeEventListener('scroll', handleScroll);
            };
        }
    }, [galleryRef, loadMorePhotos]);

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
                dataset={UnsplashLib.getColumns()}
                selectImg={selectImg}
                insertImage={insertImageToNode} 
                error={UnsplashGallery.error}
            />
        </UnsplashSelector>
        , portalContainer);
};

export default UnsplashModal;
