import CardContext from '../context/CardContext';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {HtmlNode as BaseHtmlNode, INSERT_HTML_COMMAND} from '@tryghost/kg-default-nodes';
import {HtmlCard} from '../components/ui/cards/HtmlCard';
import {ReactComponent as HtmlCardIcon} from '../assets/icons/kg-card-type-html.svg';
import {ReactComponent as HtmlIndicatorIcon} from '../assets/icons/kg-indicator-html.svg';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_HTML_COMMAND} from '@tryghost/kg-default-nodes';

function HtmlNodeComponent({nodeKey, html}) {
    const [editor] = useLexicalComposerContext();
    const cardContext = React.useContext(CardContext);
    const {cardConfig, darkMode} = React.useContext(KoenigComposerContext);

    const updateHtml = (value) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setHtml(value);
        });
    };

    return (
        <HtmlCard
            darkMode={darkMode}
            html={html}
            isEditing={cardContext.isEditing}
            nodeKey={nodeKey}
            unsplashConf={cardConfig.unsplash}
            updateHtml={updateHtml}
        />
    );
}

export class HtmlNode extends BaseHtmlNode {
    static kgMenu = {
        label: 'HTML',
        desc: 'Insert a HTML editor card',
        Icon: HtmlCardIcon,
        insertCommand: INSERT_HTML_COMMAND,
        matches: ['html']
    };

    static getType() {
        return 'html';
    }

    getIcon() {
        return HtmlCardIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper
                IndicatorIcon={HtmlIndicatorIcon}
                nodeKey={this.getKey()}
                width={this.__cardWidth}
                wrapperStyle="wide"
            >
                <HtmlNodeComponent
                    html={this.__html}
                    nodeKey={this.getKey()}
                />
            </KoenigCardWrapper>
        );
    }
}

export function $createHtmlNode(dataset) {
    return new HtmlNode(dataset);
}

export function $isHtmlNode(node) {
    return node instanceof HtmlNode;
}
