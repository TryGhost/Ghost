import React from 'react';
import {ToolbarMenu, ToolbarMenuItem} from './ToolbarMenu';
import {ImageUploadForm} from './cards/ImageCard';
import {createPortal} from 'react-dom';

function ImageCardToolbar({isSelected, fileInputRef, onFileChange, filePicker, figureRef}) {
    const element = document.querySelector('#koenig');
    const [rect, setRect] = React.useState({
        top: 0,
        left: 0,
        right: 0
    });

    React.useEffect(() => {
        if (isSelected) {
            const figureRect = figureRef.current.getBoundingClientRect();
            const top = figureRect.top - element.getBoundingClientRect().top;
            setRect({
                top: top,
                left: figureRect.left,
                right: figureRect.right
            }
            );
        }
    }, [isSelected, figureRef, element]);
    
    const toolbarPosition = {
        position: 'absolute',
        left: (rect?.right - rect?.left) / 2 || 0,
        transform: 'translate(-50%, 0)',
        top: rect?.top - 44 || 0,
        zIndex: 1000,
        opacity: isSelected ? 1 : 0
    };
    return createPortal(
        <div data-kg-image-toolbar style={toolbarPosition}>
            <ImageUploadForm onFileChange={onFileChange} fileInputRef={fileInputRef} />
            <ToolbarMenu>
                <ToolbarMenuItem label="Regular" icon="imageRegular" isActive={true} />
                <ToolbarMenuItem label="Wide" icon="imageWide" isActive={false} />
                <ToolbarMenuItem label="Full" icon="imageRegular" isActive={false} />
                <ToolbarMenuItem label="Replace" icon="imageReplace" isActive={false} onClick={filePicker} />
            </ToolbarMenu>
        </div>, element
    );
}

export default ImageCardToolbar;
