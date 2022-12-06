// Portal container that can be used to render floating elements, outside of the editor
import {createPortal} from 'react-dom';
import {$getNodeByKey, $createNodeSelection, $setSelection} from 'lexical';
import {UnsplashSelector} from './file-selectors/UnsplashSelector';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {getImageDimensions} from '../../utils/getImageDimensions';

const UnsplashModal = ({service, container, nodeKey, handleModalClose}) => {
    const [editor] = useLexicalComposerContext();
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

    const insertImageToNode = async (image) => {
        const {height, width} = await getImageDimensions(image.src);
        if (image.src) {
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.setSrc(image.src);
                node.setImgHeight(height);
                node.setImgWidth(width);
                const nodeSelection = $createNodeSelection();
                nodeSelection.add(node.getKey());
                $setSelection(nodeSelection);
            //
            });
            handleModalClose(false);
        }
    };

    if (!portalContainer) {
        return null;
    }

    const ModalService = () => {
        if (service === 'unsplash') {
            return <UnsplashSelector closeModal={closeModalHandler} insertImage={insertImageToNode} />;
        }
    };
    return createPortal(<ModalService/>, portalContainer);
};

export default UnsplashModal;
