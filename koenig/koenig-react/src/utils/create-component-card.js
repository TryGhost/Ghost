import React from 'react';
import {createRoot} from 'react-dom/client';
import {v4 as uuidv4} from 'uuid';
import {ADD_CARD_HOOK, REMOVE_CARD_HOOK} from './constants';

const RENDER_TYPE = 'dom';
const DEFAULT_KOENIG_OPTIONS = {
    hasEditMode: true,
    selectAfterInsert: true
};

const createComponentCard = ({name, component: CardComponent, koenigOptions}) => {
    return {
        name,
        type: RENDER_TYPE,

        // Called when the card is added to a mobiledoc document.
        render(cardArg) {
            const {env, options} = cardArg;
            const kgOptions = Object.assign({}, DEFAULT_KOENIG_OPTIONS, koenigOptions);

            const targetNode = document.createElement('div');
            targetNode.id = `kg-${uuidv4()}`;

            const root = createRoot(targetNode);

            // this hook lets KoenigEditor set up everything a card needs and allows
            // it to keep an internal registry of rendered cards for easier selection
            const card = options.cardProps[ADD_CARD_HOOK](cardArg, kgOptions, targetNode);

            const {didRender, onTeardown} = env;

            didRender(() => {
                const ComponentWithState = () => {
                    const {isSelected: _isSelected, isEditing: _isEditing, ...props} = card.props;
                    const [isSelected, setIsSelected] = React.useState(_isSelected);
                    const [isEditing, setIsEditing] = React.useState(_isEditing);

                    // hacky way to allow props to be changed inside KoenigEditor
                    card.setIsSelected = setIsSelected;
                    card.setIsEditing = setIsEditing;

                    return <CardComponent isSelected={isSelected} isEditing={isEditing} {...props} />;
                };

                root.render(<ComponentWithState />);
            });

            onTeardown(() => {
                options.cardProps[REMOVE_CARD_HOOK](card);
                root.unmount();
            });

            return targetNode;
        }
    };
};

export default createComponentCard;
