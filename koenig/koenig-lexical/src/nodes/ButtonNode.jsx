import CardContext from '../context/CardContext';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
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
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);
    
    // TODO: this will need to be provided by the digesting code
    const testListOptions = [
        {value: 'Homepage', caption: window.location.origin + '/'},
        {value: 'Free signup', caption: window.location.origin + '/#/portal/signup/free'}
    ];

    const [suggestedUrlVisibility, setSuggestedUrlVisibility] = React.useState(false);
    const [filteredSuggestedUrls, setFilteredSuggestedUrls] = React.useState(testListOptions);

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

    const handleButtonUrlChange = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setButtonUrl(event.target.value);
            if (buttonUrl && event.target.value) {
                setFilteredSuggestedUrls(testListOptions.filter((url) => {
                    return url.value.includes(event.target.value);
                }));
            } else {
                setFilteredSuggestedUrls(testListOptions);
            }
        });
    };

    const handleButtonUrlFocus = () => {
        setSuggestedUrlVisibility(true);
    };

    const handleAlignmentChange = (value) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setAlignment(value);
        });
    };

    const handleOptionClick = (event,value) => {
        event.stopPropagation(); // prevents loss of focus on card/settings panel
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setButtonUrl(value);
            setFilteredSuggestedUrls(testListOptions);
            setSuggestedUrlVisibility(false);
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
                handleButtonUrlFocus={handleButtonUrlFocus}
                handleOptionClick={handleOptionClick}
                isEditing={isEditing}
                suggestedUrls={filteredSuggestedUrls}
                suggestedUrlVisibility={suggestedUrlVisibility}
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
                    <ToolbarMenuSeparator />
                    <ToolbarMenuItem
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
        matches: ['button']
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
