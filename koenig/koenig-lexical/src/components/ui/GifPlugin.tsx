import GifSelector, {type GifSelectorProps} from './GifSelector';
import KoenigComposerContext from '../../context/KoenigComposerContext';
import React from 'react';
import {DELETE_CARD_COMMAND} from '../../plugins/KoenigBehaviourPlugin';
import {INSERT_FROM_GIF_COMMAND} from '../../plugins/KoenigSelectorPlugin';
import {getGifProviderConfig, useGif} from '../../utils/services/gif';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

interface GifPluginProps {
    nodeKey: string;
}

interface GifSelectorPluginProps extends GifPluginProps {
    providerConfig: NonNullable<ReturnType<typeof getGifProviderConfig>>;
}

const GifSelectorPlugin = ({nodeKey, providerConfig}: GifSelectorPluginProps) => {
    const gifHook = useGif({config: providerConfig});
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
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

    const insertImageToNode = async (image: unknown) => {
        editor.dispatchCommand(INSERT_FROM_GIF_COMMAND, image);
    };

    return (
        <GifSelector
            onClickOutside={onClickOutside}
            onGifInsert={insertImageToNode as GifSelectorProps['onGifInsert']}
            {...gifHook as unknown as Omit<GifSelectorProps, 'onGifInsert' | 'onClickOutside'>}
        />
    );
};

const GifPlugin = ({nodeKey}: GifPluginProps) => {
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const providerConfig = getGifProviderConfig(cardConfig);

    if (!providerConfig) {
        return null;
    }

    return <GifSelectorPlugin nodeKey={nodeKey} providerConfig={providerConfig} />;
};

export default GifPlugin;
