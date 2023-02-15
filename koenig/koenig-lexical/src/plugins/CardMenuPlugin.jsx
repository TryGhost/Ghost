import React from 'react';
import PlusCardMenuPlugin from '../plugins/PlusCardMenuPlugin';
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
