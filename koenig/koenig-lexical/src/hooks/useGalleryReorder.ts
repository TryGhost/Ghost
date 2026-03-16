import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import pick from 'lodash/pick';
import {getImageFilenameFromSrc} from '../utils/getImageFilenameFromSrc';
import type {DragDropHandler} from '../utils/draggable/DragDropHandler';
import type {DraggableInfo} from '../utils/draggable/ScrollHandler';
import type {GalleryImage} from '../types/GalleryImage';
import type {IndicatorPosition} from '../utils/draggable/DragDropContainer';

interface DragDropContainerRef {
    enableDrag: () => void;
    disableDrag: () => void;
    refresh: () => void;
    destroy: () => void;
}

export default function useGalleryReorder({images, updateImages, isSelected = false, maxImages = 9, disabled = false}: {images: GalleryImage[]; updateImages: (images: GalleryImage[]) => void; isSelected?: boolean; maxImages?: number; disabled?: boolean}) {
    const koenig = React.useContext(KoenigComposerContext);

    const [containerRef, setContainerRef] = React.useState<HTMLElement | null>(null);
    const [isDraggedOver, setIsDraggedOver] = React.useState(false);
    const dragDropContainer = React.useRef<DragDropContainerRef | null>(null);
    const skipOnDragEndRef = React.useRef(false);

    const onDragStart = (draggableInfo: DraggableInfo) => {
        // enable dropping when an image is dragged in from outside of this card
        const isImageDrag = draggableInfo.type === 'image' || draggableInfo.cardName === 'image';
        if (isImageDrag && draggableInfo.dataset?.src && images.length !== maxImages) {
            dragDropContainer.current?.enableDrag();
        }
    };

    const onDragEnd = () => {
        setIsDraggedOver(false);
    };

    const onDragEnterContainer = () => {
        setIsDraggedOver(true);
    };

    const onDragLeaveContainer = () => {
        setIsDraggedOver(false);
    };

    const onDrop = (draggableInfo: DraggableInfo) => {
        // do not allow dropping of non-images
        if (draggableInfo.type !== 'image' && draggableInfo.cardName !== 'image') {
            return false;
        }

        let updatedImages = [...images];
        let {insertIndex} = draggableInfo;
        const droppables = Array.from(containerRef!.querySelectorAll('[data-image]'));
        const draggableIndex = droppables.indexOf(draggableInfo.element);

        if (!updatedImages.length) {
            insertIndex = 0;
        }

        if (isDropAllowed(draggableIndex, insertIndex!)) {
            if (draggableIndex === -1) {
                // external image being added
                const dataset = draggableInfo.dataset as GalleryImage;
                const img = draggableInfo.element.querySelector(`img[src="${dataset.src}"]`) as HTMLImageElement | null;

                // image card datasets may not have all of the details we need but we can fill them in
                dataset.width = dataset.width || img?.naturalWidth;
                dataset.height = dataset.height || img?.naturalHeight;
                dataset.fileName = dataset?.fileName || (dataset.src ? getImageFilenameFromSrc(dataset.src) : undefined);

                updatedImages.splice(insertIndex!, 0, dataset);
            } else {
                // internal image being re-ordered
                const draggableDataset = draggableInfo.dataset as {src: string};
                const draggedImage = updatedImages.find(i => i.src === draggableDataset.src);
                const accountForRemoval = draggableIndex < insertIndex! && insertIndex! ? -1 : 0;
                updatedImages = updatedImages.filter(i => i !== draggedImage);
                updatedImages.splice(insertIndex! + accountForRemoval, 0, draggedImage!);
            }

            updateImages(updatedImages);
            dragDropContainer.current?.refresh();

            skipOnDragEndRef.current = true;
            return true;
        }

        return false;
    };

    // if an image is dragged out of a gallery we need to remove it
    const onDropEnd = (draggableInfo: DraggableInfo, success: boolean) => {
        if (skipOnDragEndRef.current || !success) {
            skipOnDragEndRef.current = false;
            return;
        }

        const draggableDataset = draggableInfo.dataset as {src: string};
        const image = images.find(i => i.src === draggableDataset.src);
        if (image) {
            const updatedImages = images.filter(i => i !== image);
            updateImages(updatedImages);
            dragDropContainer.current?.refresh();
        }
    };

    const getDraggableInfo = (draggableElement: HTMLElement) => {
        const src = draggableElement.querySelector('img')!.getAttribute('src')!;
        const image = images.find(i => i.src === src) || images.find(i => i.previewSrc === src);
        const dataset = image && pick(image, ['fileName', 'src', 'row', 'width', 'height', 'caption']);

        if (image) {
            return {
                type: 'image',
                dataset
            };
        }

        return {};
    };

    const getIndicatorPosition = (draggableInfo: DraggableInfo, droppableElem: Element, position: string): IndicatorPosition | false => {
        // do not allow dropping of non-images
        if (draggableInfo.type !== 'image' && draggableInfo.cardName !== 'image') {
            return false;
        }

        const row = droppableElem.closest('[data-row]');
        const droppables = Array.from(containerRef!.querySelectorAll('[data-image]'));
        const draggableIndex = droppables.indexOf(draggableInfo.element);
        const droppableIndex = droppables.indexOf(droppableElem);

        if (row && isDropAllowed(draggableIndex, droppableIndex, position)) {
            const rowImages = Array.from(row.querySelectorAll('[data-image]'));
            const rowDroppableIndex = rowImages.indexOf(droppableElem);
            let insertIndex = droppableIndex;
            const beforeElems: HTMLElement[] = [];
            const afterElems: HTMLElement[] = [];

            rowImages.forEach((image, index) => {
                if (index < rowDroppableIndex) {
                    beforeElems.push(image as HTMLElement);
                }

                if (index === rowDroppableIndex) {
                    if (position.match(/left/)) {
                        afterElems.push(image as HTMLElement);
                    } else {
                        beforeElems.push(image as HTMLElement);
                    }
                }

                if (index > rowDroppableIndex) {
                    afterElems.push(image as HTMLElement);
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

    const isDropAllowed = (draggableIndex: number, droppableIndex: number, position = ''): boolean => {
        if (draggableIndex === -1) {
            return true;
        }

        if (draggableIndex === droppableIndex || typeof droppableIndex === 'undefined') {
            return false;
        }

        if (position.match(/left/)) {
            droppableIndex -= 1;
        }

        if (position.match(/right/)) {
            droppableIndex += 1;
        }

        return droppableIndex !== draggableIndex;
    };

    React.useEffect(() => {
        if (isSelected) {
            dragDropContainer.current?.enableDrag();
        } else {
            dragDropContainer.current?.disableDrag();
        }
    }, [isSelected, containerRef]);

    React.useEffect(() => {
        const galleryElem = containerRef;

        if (!galleryElem || !koenig?.dragDropHandler) {
            return;
        }

        dragDropContainer.current = (koenig.dragDropHandler as DragDropHandler).registerContainer(
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
    }, [containerRef, images, koenig.dragDropHandler]);

    return {setContainerRef, isDraggedOver};
}
