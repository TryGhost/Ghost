import {useEffect, useState} from 'react';

export default function useDragAndDrop({handleDrop, disabled = false}) {
    const [ref, setRef] = useState(null);
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

        function onDragEnter(event) {
            cancelEvents(event);
            setDraggedOver(true);
        }

        function onDragOver(event) {
            cancelEvents(event);
            setDraggedOver(true);
        }

        function onDragLeave(event) {
            cancelEvents(event);
            setDraggedOver(false);
        }

        function onDrop(event) {
            cancelEvents(event);
            const {dataTransfer} = event;

            if (dataTransfer.files && dataTransfer.files.length > 0) {
                handleDrop(Array.from(dataTransfer.files));
            }

            setDraggedOver(false);
        }

        function cancelEvents(event) {
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
