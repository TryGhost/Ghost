import KoenigComposerContext from '../../context/KoenigComposerContext.jsx';
import React from 'react';
import TenorSelector from './TenorSelector';
import {DELETE_CARD_COMMAND} from '../../plugins/KoenigBehaviourPlugin.jsx';
import {INSERT_FROM_TENOR_COMMAND} from '../../plugins/KoenigSelectorPlugin.jsx';
import {getGifProviderConfig, useTenor} from '../../utils/services/tenor.js';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

const TenorPlugin = ({nodeKey}) => {
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const providerConfig = getGifProviderConfig(cardConfig);
    const tenorHook = useTenor({config: providerConfig});
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                editor.dispatchCommand(DELETE_CARD_COMMAND, {cardKey: nodeKey});
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };

        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onClickOutside = () => {
        editor.dispatchCommand(DELETE_CARD_COMMAND, {cardKey: nodeKey});
    };

    const insertImageToNode = async (image) => {
        editor.dispatchCommand(INSERT_FROM_TENOR_COMMAND, image);
    };

    return (
        <TenorSelector
            provider={providerConfig?.provider}
            onClickOutside={onClickOutside}
            onGifInsert={insertImageToNode}
            {...tenorHook}
        />
    );
};

export default TenorPlugin;
