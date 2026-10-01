import PlusCardMenuPlugin from '../plugins/PlusCardMenuPlugin';
import SlashCardMenuPlugin from '../plugins/SlashCardMenuPlugin';
import useLexicalEditable from '@lexical/react/useLexicalEditable';

export const CardMenuPlugin = () => {
    const isEditable = useLexicalEditable();

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
