import {useEffect, useState} from 'react';

export default function useFileDragAndDrop({handleDrop, disabled = false}: {handleDrop: (files: File[]) => void; disabled?: boolean}) {
    const [ref, setRef] = useState<HTMLElement | null>(null);
    const [isDraggedOver, setDraggedOver] = useState(false);

    useEffect(() => {
        const node = ref;
        if (!node || disabled) {
            return;
        }

        node.addEventListener('dragenter', onDragEnter);
        node.addEventListener('dragover', onDragOver);
        node.addEventListener('dragleave', onDragLeave);
        node.addEventListener('drop', onDrop);

        function onDragEnter(event: DragEvent) {
            cancelEvents(event);
            setDraggedOver(true);
        }

        function onDragOver(event: DragEvent) {
            cancelEvents(event);
            setDraggedOver(true);
        }

        function onDragLeave(event: DragEvent) {
            cancelEvents(event);
            setDraggedOver(false);
        }

        function onDrop(event: DragEvent) {
            cancelEvents(event);
            const {dataTransfer} = event;

            if (dataTransfer?.files && dataTransfer.files.length > 0) {
                handleDrop(Array.from(dataTransfer.files));
            }

            setDraggedOver(false);
        }

        function cancelEvents(event: Event) {
            event.preventDefault();
            event.stopPropagation();
        }

        return () => {
            node.removeEventListener('dragenter', onDragEnter);
            node.removeEventListener('dragover', onDragOver);
            node.removeEventListener('dragleave', onDragLeave);
            node.removeEventListener('drop', onDrop);
        };
    }, [handleDrop, ref, disabled]);

    return {setRef, isDraggedOver};
}
