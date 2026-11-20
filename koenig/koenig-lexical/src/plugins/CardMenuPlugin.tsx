import PlusCardMenuPlugin from '../plugins/PlusCardMenuPlugin';
import SlashCardMenuPlugin from '../plugins/SlashCardMenuPlugin';
import {useIsDocumentEditable} from '../hooks/useIsDocumentEditable';

export const CardMenuPlugin = () => {
    const isEditable = useIsDocumentEditable();

    // the menus insert cards, which a read-only editor must not offer
    if (!isEditable) {
        return null;
    }

    return (
        <>
            {/* Koenig Plugins */}
            <PlusCardMenuPlugin />
            <SlashCardMenuPlugin />
        </>
    );
};

export default CardMenuPlugin;
