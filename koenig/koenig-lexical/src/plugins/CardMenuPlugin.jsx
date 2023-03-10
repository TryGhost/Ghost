import PlusCardMenuPlugin from '../plugins/PlusCardMenuPlugin';
import React from 'react';
import SlashCardMenuPlugin from '../plugins/SlashCardMenuPlugin';

export const CardMenuPlugin = () => {
    return (
        <>
            {/* Koenig Plugins */}
            <PlusCardMenuPlugin />
            <SlashCardMenuPlugin />
        </>
    );
};

export default CardMenuPlugin;
