import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {pick} from 'lodash-es';

const SELECTED_CLASSES = [
    'shadow-[0_0_0_2px]',
    'shadow-green'
];

export default function useGalleryReorder({images, updateImages, isSelected = false, maxImages = 9, disabled = false}) {
    const koenig = React.useContext(KoenigComposerContext);

    const [containerRef, setContainerRef] = React.useState(null);
    const [isDraggedOver, setIsDraggedOver] = React.useState(false);
    const dragDropContainer = React.useRef(null);
    const skipOnDragEndRef = React.useRef(false);

    const onDragStart = (draggableInfo) => {
        containerRef.closest('[data-kg-card]').classList.remove(...SELECTED_CLASSES);

        // enable dropping when an image is dragged in from outside of this card
        const isImageDrag = draggableInfo.type === 'image' || draggableInfo.cardName === 'image';
        if (isImageDrag && draggableInfo.payload.src && images.length !== maxImages) {
            dragDropContainer.current.enableDrag();
        }

        setIsDraggedOver(true);
    };

    const onDragEnd = () => {
        if (isSelected) {
            containerRef.closest('[data-kg-card]').classList.add(...SELECTED_CLASSES);
        } else {
            dragDropContainer.current.disableDrag();
        }

        setIsDraggedOver(false);
    };

    const onDragEnterContainer = () => {
        setIsDraggedOver(true);
    };

    const onDragLeaveContainer = () => {
        setIsDraggedOver(false);
    };

    const onDrop = (draggableInfo) => {
        // do not allow dropping of non-images
        if (draggableInfo.type !== 'image' && draggableInfo.cardName !== 'image') {
            return false;
        }

        let updatedImages = [...images];
        let {insertIndex} = draggableInfo;
        const droppables = Array.from(containerRef.querySelectorAll('[data-image]'));
        const draggableIndex = droppables.indexOf(draggableInfo.element);

        if (!updatedImages.length) {
            insertIndex = 0;
        }

        if (isDropAllowed(draggableIndex, insertIndex)) {
            if (draggableIndex === -1) {
                // external image being added
                const {payload} = draggableInfo;
                const img = draggableInfo.element.querySelector(`img[src="${payload.src}"]`);

                // image card payloads may not have all of the details we need but we can fill them in
                payload.width = payload.width || img.naturalWidth;
                payload.height = payload.height || img.naturalHeight;
                if (!payload.fileName) {
                    const url = new URL(payload.src || img.src);
                    const fileName = url.pathname.match(/\/([^/]*)$/)[1];
                    payload.fileName = fileName;
                }

                updatedImages.splice(insertIndex, 0, payload);
            } else {
                // internal image being re-ordered
                const draggedImage = updatedImages.find(i => i.src === draggableInfo.payload.src);
                const accountForRemoval = draggableIndex < insertIndex && insertIndex ? -1 : 0;
                updatedImages = updatedImages.filter(i => i !== draggedImage);
                updatedImages.splice(insertIndex + accountForRemoval, 0, draggedImage);
            }

            updateImages(updatedImages);
            dragDropContainer.current.refresh();

            skipOnDragEndRef.current = true;
            return true;
        }

        return false;
    };

    // if an image is dragged out of a gallery we need to remove it
    const onDropEnd = (draggableInfo, success) => {
        if (skipOnDragEndRef.current || !success) {
            skipOnDragEndRef.current = false;
            return;
        }

        const image = images.find(i => i.src === draggableInfo.payload.src);
        if (image) {
            const updatedImages = images.filter(i => i !== image);
            updateImages(updatedImages);
            dragDropContainer.current.refresh();
        }
    };

    const getDraggableInfo = (draggableElement) => {
        let src = draggableElement.querySelector('img').getAttribute('src');
        let image = images.find(i => i.src === src) || images.find(i => i.previewSrc === src);
        let payload = image && pick(image, ['fileName', 'src', 'row', 'width', 'height', 'caption']);

        if (image) {
            return {
                type: 'image',
                payload
            };
        }

        return {};
    };

    // returns {
    //   direction: 'horizontal' TODO: use a constant?
    //   position: 'left'/'right' TODO: use constants?
    //   beforeElems: array of elems to left of indicator
    //   afterElems: array of elems to right of indicator
    //   droppableIndex:
    // }
    const getIndicatorPosition = (draggableInfo, droppableElem, position) => {
        // do not allow dropping of non-images
        if (draggableInfo.type !== 'image' && draggableInfo.cardName !== 'image') {
            return false;
        }

        const row = droppableElem.closest('[data-row]');
        const droppables = Array.from(containerRef.querySelectorAll('[data-image]'));
        const draggableIndex = droppables.indexOf(draggableInfo.element);
        const droppableIndex = droppables.indexOf(droppableElem);

        if (row && isDropAllowed(draggableIndex, droppableIndex, position)) {
            const rowImages = Array.from(row.querySelectorAll('[data-image]'));
            const rowDroppableIndex = rowImages.indexOf(droppableElem);
            let insertIndex = droppableIndex;
            const beforeElems = [];
            const afterElems = [];

            rowImages.forEach((image, index) => {
                if (index < rowDroppableIndex) {
                    beforeElems.push(image);
                }

                if (index === rowDroppableIndex) {
                    if (position.match(/left/)) {
                        afterElems.push(image);
                    } else {
                        beforeElems.push(image);
                    }
                }

                if (index > rowDroppableIndex) {
                    afterElems.push(image);
                }
            });

            if (position.match(/right/)) {
                insertIndex += 1;
            }

            return {
                direction: 'horizontal',
                position: position.match(/left/) ? 'left' : 'right',
                beforeElems,
                afterElems,
                insertIndex
            };
        } else {
            return false;
        }
    };

    // we don't allow an image to be dropped where it would end up in the
    // same position within the gallery
    const isDropAllowed = (draggableIndex, droppableIndex, position = '') => {
        // external images can always be dropped
        if (draggableIndex === -1) {
            return true;
        }

        // can't drop on itself or when droppableIndex doesn't exist
        if (draggableIndex === droppableIndex || typeof droppableIndex === 'undefined') {
            return false;
        }

        // account for dropping at beginning or end of a row
        if (position.match(/left/)) {
            droppableIndex -= 1;
        }

        if (position.match(/right/)) {
            droppableIndex += 1;
        }

        return droppableIndex !== draggableIndex;
    };

    React.useEffect(() => {
        const galleryElem = containerRef;

        if (!galleryElem || !isSelected) {
            return;
        }

        dragDropContainer.current = koenig.dragDropHandler.registerContainer(
            galleryElem,
            {
                draggableSelector: '[data-image]',
                droppableSelector: '[data-image]',
                isDragEnabled: !disabled && images.length > 0,
                onDragStart,
                onDragEnd,
                onDragEnterContainer,
                onDragLeaveContainer,
                getDraggableInfo,
                getIndicatorPosition,
                onDrop,
                onDropEnd
            }
        );

        return () => {
            if (dragDropContainer.current) {
                dragDropContainer.current.destroy();
                dragDropContainer.current = null;
            }
        };

        // we want to be specific about when we want the drag/drop handler to
        // be set up or refreshed so we disable the exhaustive-deps rule here
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerRef, images, isSelected]);

    return {setContainerRef, isDraggedOver};
}
