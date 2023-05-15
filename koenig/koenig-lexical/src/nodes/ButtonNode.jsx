import CardContext from '../context/CardContext';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {ButtonNode as BaseButtonNode, INSERT_BUTTON_COMMAND} from '@tryghost/kg-default-nodes';
import {ButtonCard} from '../components/ui/cards/ButtonCard';
import {ReactComponent as ButtonCardIcon} from '../assets/icons/kg-card-type-button.svg';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_BUTTON_COMMAND} from '@tryghost/kg-default-nodes';

function ButtonNodeComponent({alignment, buttonText, buttonUrl, nodeKey}) {
    const [editor] = useLexicalComposerContext();
    const {isEditing, isSelected, setEditing} = React.useContext(CardContext);
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
    };

    const handleButtonTextChange = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setButtonText(event.target.value);
        });
    };

    const handleButtonUrlChange = (val) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setButtonUrl(val);
        });
    };

    const handleAlignmentChange = (value) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setAlignment(value);
        });
    };

    return (
        <>
            <ButtonCard
                alignment={alignment}
                buttonPlaceholder={`Add button text`}
                buttonText={buttonText}
                buttonUrl={buttonUrl}
                handleAlignmentChange={handleAlignmentChange}
                handleButtonTextChange={handleButtonTextChange}
                handleButtonUrlChange={handleButtonUrlChange}
                isEditing={isEditing}
            />
            <ActionToolbar
                data-kg-card-toolbar="button"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="button"
                isVisible={isSelected && !isEditing}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="edit-button-card" icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
                    <ToolbarMenuSeparator hide={!cardConfig.createSnippet} />
                    <ToolbarMenuItem
                        dataTestId="create-snippet"
                        hide={!cardConfig.createSnippet}
                        icon="snippet"
                        isActive={false}
                        label="Snippet"
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}

export class ButtonNode extends BaseButtonNode {
    static kgMenu = {
        label: 'Button',
        desc: 'Add a button to your post',
        Icon: ButtonCardIcon,
        insertCommand: INSERT_BUTTON_COMMAND,
        matches: ['button'],
        priority: 10
    };

    static getType() {
        return 'button';
    }

    // transient properties used to control node behaviour
    __openInEditMode = false;

    constructor(dataset = {}, key) {
        super(dataset, key);

        const {_openInEditMode} = dataset;
        this.__openInEditMode = _openInEditMode || false;
    }

    getIcon() {
        return ButtonCardIcon;
    }

    clearOpenInEditMode() {
        const self = this.getWritable();
        self.__openInEditMode = false;
    }

    decorate() {
        return (
            <KoenigCardWrapper
                nodeKey={this.getKey()}
                openInEditMode={this.__openInEditMode}
                width={this.__cardWidth}
                wrapperStyle="wide"
            >
                <ButtonNodeComponent
                    alignment={this.__alignment}
                    buttonText={this.__buttonText}
                    buttonUrl={this.__buttonUrl}
                    nodeKey={this.getKey()}
                />
            </KoenigCardWrapper>
        );
    }
}

export function $createButtonNode(dataset) {
    return new ButtonNode(dataset);
}

export function $isButtonNode(node) {
    return node instanceof ButtonNode;
}
